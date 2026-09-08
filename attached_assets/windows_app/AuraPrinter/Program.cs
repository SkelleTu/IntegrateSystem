using System;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Drawing;
using System.Drawing.Printing;

namespace AuraLabelPrinter
{
    class Program
    {
        // URL configurada para o seu domínio real
        private static string wsUrl = "wss://bbb42672-7fe2-4197-964e-f32951ce4490-00-d4lz4avucqpo.picard.replit.dev/ws/labels";

        static async Task Main(string[] args)
        {
            Console.WriteLine("=== AURA WINDOWS LABEL PRINTER ===");
            Console.WriteLine("Conectando ao servidor...");

            while (true)
            {
                try
                {
                    using (var ws = new ClientWebSocket())
                    {
                        await ws.ConnectAsync(new Uri(wsUrl), CancellationToken.None);
                        Console.WriteLine("Conectado com sucesso!");

                        // Identifica-se como o cliente Windows
                        var hello = JsonConvert.SerializeObject(new { type = "WINDOWS_HELLO" });
                        await ws.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(hello)), WebSocketMessageType.Text, true, CancellationToken.None);

                        while (ws.State == WebSocketState.Open)
                        {
                            var buffer = new byte[1024 * 4];
                            var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);

                            if (result.MessageType == WebSocketMessageType.Text)
                            {
                                var msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
                                var data = JsonConvert.DeserializeObject<dynamic>(msg);

                                if (data.type == "PRINT_LABEL")
                                {
                                    Console.WriteLine($"Recebido comando de impressão: {data.payload.produto}");
                                    PrintLabel(data.payload);
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Erro: {ex.Message}. Tentando reconectar em 5s...");
                    await Task.Delay(5000);
                }
            }
        }

        static void PrintLabel(dynamic payload)
        {
            PrintDocument pd = new PrintDocument();
            pd.PrintPage += (sender, ev) =>
            {
                // Configuração básica da etiqueta (exemplo 40x40mm ou 60x40mm)
                Font fontBold = new Font("Arial", 10, FontStyle.Bold);
                Font fontNormal = new Font("Arial", 8);
                Font fontSmall = new Font("Arial", 6);

                float y = 10;
                ev.Graphics.DrawString("AURA - SKELLETU", fontSmall, Brushes.Black, 10, y);
                y += 15;
                ev.Graphics.DrawString((string)payload.produto, fontBold, Brushes.Black, 10, y);
                y += 20;
                ev.Graphics.DrawString($"PESO LÍQ: {payload.peso} kg", fontNormal, Brushes.Black, 10, y);
                y += 15;
                ev.Graphics.DrawString($"PREÇO/KG: R$ {payload.precoKg}", fontNormal, Brushes.Black, 10, y);
                y += 15;
                ev.Graphics.DrawString($"TOTAL: R$ {payload.total}", fontBold, Brushes.Black, 10, y);
                y += 20;
                ev.Graphics.DrawString("VALORES NUTRICIONAIS (PROPORCIONAL)", fontSmall, Brushes.Black, 10, y);
                y += 10;
                ev.Graphics.DrawString($"Energia: {payload.nutricao.energia}kcal | Carbo: {payload.nutricao.carbo}g", fontSmall, Brushes.Black, 10, y);
            };

            try {
                pd.Print();
                Console.WriteLine("Impressão enviada para a impressora padrão.");
            } catch (Exception e) {
                Console.WriteLine("Erro ao imprimir: " + e.Message);
            }
        }
    }
}
