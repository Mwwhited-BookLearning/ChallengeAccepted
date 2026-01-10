using System;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

namespace TcpServer;

public class PrinterServer(
    IPAddress? ipAddress = default,
    string queuePath = "queue",
    string fileFormatter = "Received_[CLIENTID]_[COUNT]_[DATE].bin",
    ushort port = 9100
    ) : ServerBase(ipAddress, port)
{
    private readonly ConcurrentDictionary<int, (TcpClient client, Stream stream)> _connections = [];
    private int _counter = 0;

    protected override async Task MessageReceivedAsync(int clientId, TcpClient accepted, ReadOnlyMemory<byte> message, CancellationToken cancellationToken)
    {
        if (!_connections.TryGetValue(clientId, out var connection))
        {
            var fileName = fileFormatter.Replace("[CLIENTID]", clientId.ToString())
                                        .Replace("[COUNT]", (_counter++).ToString())
                                        .Replace("[DATE]", DateTime.Now.ToString("yyyyMMddHHmmss"))
                                        ;
            var filePath = Path.Combine(queuePath, fileName);

            var dir = Path.GetDirectoryName(filePath);
            if (dir != null && !Directory.Exists(dir)) Directory.CreateDirectory(dir);

            var stream = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.Read);
            this.Disposables.Add(stream);

            connection = (accepted, stream);
            _connections.TryAdd(clientId, connection);
        }

        await connection.stream.WriteAsync(message, cancellationToken);
    }

    protected override async Task ConnectionEndedAsync(int clientId, TcpClient accepted, CancellationToken cancellationToken)
    {
        try
        {
            if (_connections.TryGetValue(clientId, out var connection))
            {
                Debug.WriteLine($"Close File!: {clientId}");
                await connection.stream.FlushAsync();
                connection.stream.Close();
            }
        }
        catch (Exception ex)
        {
            //Don't care
            Debug.WriteLine(ex.Message);
        }
    }
}