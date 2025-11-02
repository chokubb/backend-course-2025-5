const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { Command } = require("commander");

const program = new Command();
program
  .requiredOption("-h, --host <host>", "server host")
  .requiredOption("-p, --port <port>", "server port", v => parseInt(v, 10))
  .requiredOption("-c, --cache <dir>", "cache directory");
program.parse(process.argv);
const opts = program.opts();

if (!fs.existsSync(opts.cache)) {
  fs.mkdirSync(opts.cache, { recursive: true });
  console.log(`Директорію "${opts.cache}" створено програмою за шляхом: ${path.resolve(opts.cache)}`);
}

const MIME = { jpeg: "image/jpeg" };

const server = http.createServer(async (req, res) => {
  try {
    const code = (req.url || "/").split("?")[0].replace(/^\/+/, "");
    if (!/^\d{3}$/.test(code)) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Bad Request: path must be /<3-digit-code>");
    }

    const filePath = path.join(opts.cache, `${code}.jpg`);

    if (req.method === "GET") {
      try {
        const buf = await fsp.readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME.jpeg });
        return res.end(buf);
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Not Found");
      }
    }

    if (req.method === "PUT") {
      const chunks = [];
      req.on("data", ch => chunks.push(ch));
      req.on("end", async () => {
        const buf = Buffer.concat(chunks);
        await fsp.writeFile(filePath, buf);
        res.writeHead(201, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Created");
      });
      return;
    }

    if (req.method === "DELETE") {
      try {
        await fsp.unlink(filePath);
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("OK");
      } catch {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end("Not Found");
      }
    }

    // інші методи 405
    res.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      "Allow": "GET, PUT, DELETE"
    });
    res.end("Method Not Allowed");

  } catch (e) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error");
  }
});

server.listen(opts.port, opts.host, () => {
  console.log(`It works!! Server running at http://${opts.host}:${opts.port}/`);
});