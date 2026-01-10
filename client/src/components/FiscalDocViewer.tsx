import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";

interface FiscalDocProps {
  sale: any;
  onClose: () => void;
}

export function FiscalDocViewer({ sale, onClose }: FiscalDocProps) {
  const isNFCe = sale.fiscalType === "NFCe";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-black print:max-h-none print:shadow-none print:border-none">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 print:hidden">
          <CardTitle className="text-xl font-bold uppercase italic tracking-tighter">
            {isNFCe ? "Cupom Fiscal (NFC-e)" : "DANFE (NF-e)"}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={handlePrint} data-testid="button-print">
              <Printer className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8 font-mono text-[10px] sm:text-xs">
          {/* Header */}
          <div className="text-center border-b pb-4 mb-4">
            <h1 className="font-black uppercase text-base tracking-widest">Barbearia & Padaria SkelleTu</h1>
            <p>CNPJ: 00.000.000/0001-91</p>
            <p>Rua Exemplo, 123 - Centro, São Paulo - SP</p>
          </div>

          {/* DANFE Info */}
          <div className="flex justify-between border-b pb-2 mb-4">
            <div>
              <p className="font-bold uppercase">DANFE {isNFCe ? "NFC-e" : "NF-e"}</p>
              <p>Série: 001 | Número: {String(sale.id).padStart(9, '0')}</p>
            </div>
            <div className="text-right">
              <p>Emissão: {new Date(sale.createdAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-4 border-collapse">
            <thead>
              <tr className="border-b border-black text-left uppercase font-bold">
                <th className="pb-1">Item</th>
                <th className="pb-1 text-center">Qtd</th>
                <th className="pb-1 text-right">Unit</th>
                <th className="pb-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-black/10">
                    <td className="py-1 uppercase">{item.name || "Item " + (idx + 1)}</td>
                    <td className="py-1 text-center">{Number(item.quantity).toFixed(3)}</td>
                    <td className="py-1 text-right">R$ {(item.unitPrice / 100).toFixed(2)}</td>
                    <td className="py-1 text-right">R$ {(item.totalPrice / 100).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-black/10">
                  <td className="py-1 uppercase">Venda de Mercadorias</td>
                  <td className="py-1 text-center">1.000</td>
                  <td className="py-1 text-right">R$ {(sale.totalAmount / 100).toFixed(2)}</td>
                  <td className="py-1 text-right">R$ {(sale.totalAmount / 100).toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex flex-col items-end gap-1 mb-4">
            <div className="flex justify-between w-48 font-bold border-t pt-2 border-black">
              <span>TOTAL:</span>
              <span>R$ {(sale.totalAmount / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Fiscal Key & QR Code Placeholder */}
          <div className="border border-black p-4 text-center mt-8">
            <p className="font-bold mb-2 uppercase">Chave de Acesso</p>
            <p className="text-[10px] break-all">{sale.fiscalKey || "CHAVE NÃO GERADA"}</p>
            {isNFCe && (
              <div className="mt-4 flex flex-col items-center">
                <div className="w-24 h-24 bg-zinc-200 flex items-center justify-center border border-dashed border-zinc-400">
                  <span className="text-[8px] uppercase">QR Code NFC-e</span>
                </div>
                <p className="text-[8px] mt-2 italic">Consulta via QR Code</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-[8px] text-zinc-500 uppercase">
            <p>Protocolo de Autorização: {Math.random().toString().substring(2, 17)}</p>
            <p>Ambiente de Homologação - Sem Valor Fiscal</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
