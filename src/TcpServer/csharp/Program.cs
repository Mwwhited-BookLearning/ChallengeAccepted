using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TcpServer;

public class Program
{
    public static async Task Main(string[] args)
    {
        var services = new List<IServerBase>()
        {
            new EchoServer(),
            new DiscardServer(),
            new DaytimeServer(),
            new TimeServer(),
            new ChargenServer(),
            new HttpServer("./web-root"),
            new PrinterServer(),
        };
        foreach (var service in services)
        {
            service.Start();
        }

        Console.WriteLine("Running!");
        Console.ReadLine();

        foreach (var service in services)
        {
            var dis = await service.StopAsync();
            await dis.DisposeAsync();
        }
    }
}
