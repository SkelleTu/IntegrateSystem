import Database from "better-sqlite3";
import path from "path";

const sqlitePath = path.join(process.cwd(), "sqlite.db");
const db = new Database(sqlitePath);
db.pragma('foreign_keys = ON');

// List all products
const allProducts = db.prepare('SELECT id, name FROM menu_items ORDER BY id').all() as any[];
console.log("=== PRODUTOS ATUAIS ===\n");
allProducts.forEach((p: any) => console.log(`ID ${p.id}: ${p.name}`));

// Find products to keep
const paoBrancesId = allProducts.find((p: any) => p.name.toLowerCase().includes("pão"))?.id;
const cocaId = allProducts.find((p: any) => p.name.toLowerCase().includes("coca"))?.id;

console.log(`\n=== PRODUTOS A MANTER ===`);
console.log(`Pão Francês - ID: ${paoBrancesId}`);
console.log(`Coca 2L - ID: ${cocaId}`);

if (paoBrancesId && cocaId) {
  // Delete inventory items for deleted menu items
  const deleteInventoryStmt = db.prepare(`
    DELETE FROM inventory 
    WHERE item_id NOT IN (?, ?) AND item_id IS NOT NULL
  `);
  const invResult = deleteInventoryStmt.run(paoBrancesId, cocaId);
  
  // Delete menu items
  const deleteMenuStmt = db.prepare(`
    DELETE FROM menu_items 
    WHERE id NOT IN (?, ?)
  `);
  const menuResult = deleteMenuStmt.run(paoBrancesId, cocaId);
  
  console.log(`\n=== LIMPEZA EXECUTADA ===`);
  console.log(`Registros de inventário deletados: ${invResult.changes}`);
  console.log(`Produtos deletados: ${menuResult.changes}`);
  
  // Verify remaining products
  const remaining = db.prepare('SELECT id, name FROM menu_items ORDER BY id').all() as any[];
  console.log(`\n✅ Produtos restantes: ${remaining.length}`);
  remaining.forEach((p: any) => console.log(`  - ID ${p.id}: ${p.name}`));
  
  // Check inventory counts
  const inventoryCounts = db.prepare(`
    SELECT COUNT(*) as count FROM inventory WHERE item_id IS NOT NULL
  `).get() as any;
  console.log(`\nRegistros de estoque vinculados: ${inventoryCounts.count}`);
} else {
  console.log("\n❌ ERRO: Não encontramos ambos os produtos!");
  process.exit(1);
}

db.close();
console.log("\n✅ Limpeza do banco concluída com sucesso!");
