-- Neon PostgreSQL smoke test for the cash-register and inventory data model.
-- Run only against an isolated test database. Every row created by this test is removed.
-- This validates PostgreSQL schema/constraints and transaction-compatible data operations;
-- it does not replace end-to-end tests through the application storage/API.

DO $test$
DECLARE
  v_user_id BIGINT := 91000000 + floor(random() * 8000000)::BIGINT;
  v_register_id BIGINT;
  v_inventory_id BIGINT;
  v_sale_id BIGINT;
  v_product_id BIGINT;
  v_batch_id BIGINT;
  v_expected BIGINT;
  v_count BIGINT;
BEGIN
  -- Opening is auditable and the partial unique index rejects a second open register.
  INSERT INTO cash_register(user_id, opened_at, opening_amount, status)
  VALUES (v_user_id, (extract(epoch FROM clock_timestamp()) * 1000)::BIGINT, 1000, 'open')
  RETURNING id INTO v_register_id;
  INSERT INTO cash_register_movements(cash_register_id,user_id,type,amount,reason,created_at)
  VALUES(v_register_id,v_user_id,'opening',1000,'TEST: abertura',(extract(epoch FROM clock_timestamp())*1000)::BIGINT);

  BEGIN
    INSERT INTO cash_register(user_id, opened_at, opening_amount, status)
    VALUES(v_user_id, (extract(epoch FROM clock_timestamp()) * 1000)::BIGINT, 1000, 'open');
    RAISE EXCEPTION 'TEST FAIL: duplicate open register was allowed';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- Replenishment, withdrawal and adjustment reconcile to the expected cash balance.
  INSERT INTO cash_register_movements(cash_register_id,user_id,type,amount,reason,created_at)
  VALUES
   (v_register_id,v_user_id,'replenishment',500,'TEST: reposição',(extract(epoch FROM clock_timestamp())*1000)::BIGINT),
   (v_register_id,v_user_id,'withdrawal',200,'TEST: sangria',(extract(epoch FROM clock_timestamp())*1000)::BIGINT),
   (v_register_id,v_user_id,'adjustment',100,'TEST: ajuste',(extract(epoch FROM clock_timestamp())*1000)::BIGINT);
  SELECT SUM(CASE type WHEN 'opening' THEN amount WHEN 'replenishment' THEN amount WHEN 'withdrawal' THEN -amount WHEN 'adjustment' THEN amount ELSE 0 END)
    INTO v_expected FROM cash_register_movements WHERE cash_register_id=v_register_id;
  IF v_expected <> 1400 THEN RAISE EXCEPTION 'TEST FAIL: expected cash after movements should be 1400, got %',v_expected; END IF;

  INSERT INTO cash_register_movements(cash_register_id,user_id,type,amount,reason,created_at)
  VALUES(v_register_id,v_user_id,'withdrawal',1000,'TEST: sangria',(extract(epoch FROM clock_timestamp())*1000)::BIGINT);
  SELECT SUM(CASE type WHEN 'opening' THEN amount WHEN 'replenishment' THEN amount WHEN 'withdrawal' THEN -amount WHEN 'adjustment' THEN amount ELSE 0 END)
    INTO v_expected FROM cash_register_movements WHERE cash_register_id=v_register_id;
  IF v_expected <> 400 THEN RAISE EXCEPTION 'TEST FAIL: expected cash after withdrawal should be 400, got %',v_expected; END IF;

  -- Inventory receiving is recorded in both current stock and its audit/history tables.
  INSERT INTO inventory(item_type,custom_name,quantity,unit,items_per_unit,cost_price,sale_price,min_stock,rotation,image_scale,updated_at)
  VALUES('product','KERNEL-TEST-ITEM',2,'unit',1,500,2000,0,0,100,(extract(epoch FROM clock_timestamp())*1000)::BIGINT)
  RETURNING id INTO v_inventory_id;
  UPDATE inventory SET quantity=quantity+3,updated_at=(extract(epoch FROM clock_timestamp())*1000)::BIGINT WHERE id=v_inventory_id;
  INSERT INTO inventory_restocks(inventory_id,quantity,unit,items_per_unit,cost_price,created_at)
  VALUES(v_inventory_id,3,'unit',1,500,(extract(epoch FROM clock_timestamp())*1000)::BIGINT);
  INSERT INTO inventory_logs(inventory_id,type,quantity,reason,user_id,created_at)
  VALUES(v_inventory_id,'restock',3,'TEST: reposição de estoque',v_user_id,(extract(epoch FROM clock_timestamp())*1000)::BIGINT);
  IF (SELECT quantity FROM inventory WHERE id=v_inventory_id) <> 5 THEN RAISE EXCEPTION 'TEST FAIL: inventory restock'; END IF;

  -- Product -> batch stock and its log are also writable and queryable.
  INSERT INTO products(name,unit,min_stock,em_liquidacao,created_at,updated_at)
  VALUES('KERNEL-TEST-BATCH-PRODUCT','unit',0,0,(extract(epoch FROM clock_timestamp())*1000)::BIGINT,(extract(epoch FROM clock_timestamp())*1000)::BIGINT)
  RETURNING id INTO v_product_id;
  INSERT INTO batches(product_id,entry_date,quantity,cost_price,created_at)
  VALUES(v_product_id,(extract(epoch FROM clock_timestamp())*1000)::BIGINT,4,500,(extract(epoch FROM clock_timestamp())*1000)::BIGINT)
  RETURNING id INTO v_batch_id;
  INSERT INTO batch_logs(product_id,batch_id,type,quantity,reason,user_id,created_at)
  VALUES(v_product_id,v_batch_id,'restock',4,'TEST: lote inicial',v_user_id,(extract(epoch FROM clock_timestamp())*1000)::BIGINT);
  IF (SELECT quantity FROM batches WHERE id=v_batch_id) <> 4 THEN RAISE EXCEPTION 'TEST FAIL: batch quantity'; END IF;

  -- Cash sale deducts one stock unit and increases the cash expected amount.
  INSERT INTO sales(cash_register_id,user_id,total_amount,fiscal_status,status,created_at)
  VALUES(v_register_id,v_user_id,2000,'none','completed',(extract(epoch FROM clock_timestamp())*1000)::BIGINT)
  RETURNING id INTO v_sale_id;
  INSERT INTO sale_items(sale_id,item_type,item_id,quantity,unit_price,total_price,unit_type)
  VALUES(v_sale_id,'product',v_inventory_id,1,2000,2000,'unit');
  INSERT INTO payments(sale_id,method,amount,created_at)
  VALUES(v_sale_id,'cash',2000,(extract(epoch FROM clock_timestamp())*1000)::BIGINT);
  UPDATE inventory SET quantity=quantity-1,updated_at=(extract(epoch FROM clock_timestamp())*1000)::BIGINT WHERE id=v_inventory_id;
  IF (SELECT quantity FROM inventory WHERE id=v_inventory_id) <> 4 THEN RAISE EXCEPTION 'TEST FAIL: sale stock deduction'; END IF;
  SELECT SUM(CASE type WHEN 'opening' THEN amount WHEN 'replenishment' THEN amount WHEN 'withdrawal' THEN -amount WHEN 'adjustment' THEN amount ELSE 0 END)
      + COALESCE((SELECT SUM(p.amount) FROM payments p JOIN sales s ON s.id=p.sale_id WHERE s.cash_register_id=v_register_id AND s.status='completed' AND p.method='cash'),0)
    INTO v_expected FROM cash_register_movements WHERE cash_register_id=v_register_id;
  IF v_expected <> 2400 THEN RAISE EXCEPTION 'TEST FAIL: sale cash balance should be 2400, got %',v_expected; END IF;

  -- Cancellation is idempotent, restores stock and reverses the cash-sale contribution.
  UPDATE sales SET status='cancelled' WHERE id=v_sale_id AND status='completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST FAIL: sale cancellation'; END IF;
  UPDATE inventory SET quantity=quantity+1,updated_at=(extract(epoch FROM clock_timestamp())*1000)::BIGINT WHERE id=v_inventory_id;
  INSERT INTO transactions(business_type,type,category,description,amount,created_at)
  VALUES('cashier','reversal','sale','TEST: reversal for sale '||v_sale_id,-2000,(extract(epoch FROM clock_timestamp())*1000)::BIGINT);
  SELECT SUM(CASE type WHEN 'opening' THEN amount WHEN 'replenishment' THEN amount WHEN 'withdrawal' THEN -amount WHEN 'adjustment' THEN amount ELSE 0 END)
      + COALESCE((SELECT SUM(p.amount) FROM payments p JOIN sales s ON s.id=p.sale_id WHERE s.cash_register_id=v_register_id AND s.status='completed' AND p.method='cash'),0)
    INTO v_expected FROM cash_register_movements WHERE cash_register_id=v_register_id;
  IF v_expected <> 400 THEN RAISE EXCEPTION 'TEST FAIL: cancelled sale cash balance should be 400, got %',v_expected; END IF;
  IF (SELECT quantity FROM inventory WHERE id=v_inventory_id) <> 5 THEN RAISE EXCEPTION 'TEST FAIL: cancellation stock restoration'; END IF;
  UPDATE sales SET status='cancelled' WHERE id=v_sale_id AND status='completed';
  IF FOUND THEN RAISE EXCEPTION 'TEST FAIL: repeated cancellation was not idempotent'; END IF;
  SELECT COUNT(*) INTO v_count FROM transactions WHERE description='TEST: reversal for sale '||v_sale_id;
  IF v_count <> 1 THEN RAISE EXCEPTION 'TEST FAIL: duplicated financial reversal'; END IF;

  -- Closing can transition from open exactly once.
  UPDATE cash_register SET status='closed',closing_amount=400,closed_at=(extract(epoch FROM clock_timestamp())*1000)::BIGINT,difference=0
    WHERE id=v_register_id AND status='open';
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST FAIL: register close'; END IF;
  UPDATE cash_register SET status='closed',closing_amount=400,closed_at=(extract(epoch FROM clock_timestamp())*1000)::BIGINT,difference=0
    WHERE id=v_register_id AND status='open';
  IF FOUND THEN RAISE EXCEPTION 'TEST FAIL: repeated close was allowed'; END IF;

  DELETE FROM transactions WHERE description='TEST: reversal for sale '||v_sale_id;
  DELETE FROM payments WHERE sale_id=v_sale_id;
  DELETE FROM sale_items WHERE sale_id=v_sale_id;
  DELETE FROM sales WHERE id=v_sale_id;
  DELETE FROM inventory_logs WHERE inventory_id=v_inventory_id;
  DELETE FROM inventory_restocks WHERE inventory_id=v_inventory_id;
  DELETE FROM inventory WHERE id=v_inventory_id;
  DELETE FROM batch_logs WHERE product_id=v_product_id;
  DELETE FROM batches WHERE id=v_batch_id;
  DELETE FROM products WHERE id=v_product_id;
  DELETE FROM cash_register_movements WHERE cash_register_id=v_register_id;
  DELETE FROM cash_register WHERE id=v_register_id;
END $test$;
