const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = process.env.DATA_DIR || path.join(root, ".data");
const dataFile = path.join(dataDir, "db.json");
const port = Number(process.env.PORT || 3000);
const maxBodyBytes = 5 * 1024 * 1024;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(response, status, body, type) {
  response.writeHead(status, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Cache-Control": status === 200 ? "no-store" : "no-cache"
  });
  response.end(body);
}

function readDatabase() {
  try {
    return fs.readFileSync(dataFile, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function writeDatabase(body) {
  const value = JSON.parse(body);
  if (!value || !Array.isArray(value.users) || !Array.isArray(value.roles)) {
    throw new Error("Database must contain users and roles arrays");
  }
  fs.mkdirSync(dataDir, { recursive: true });
  const temporary = dataFile + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(value), "utf8");
  fs.renameSync(temporary, dataFile);
}

function receiveBody(request, response, callback) {
  let body = "";
  request.setEncoding("utf8");
  request.on("data", chunk => {
    body += chunk;
    if (Buffer.byteLength(body, "utf8") > maxBodyBytes) {
      send(response, 413, "Request body is too large");
      request.destroy();
    }
  });
  request.on("end", () => callback(body));
}

function serveFile(urlPath, response) {
  const requested = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath.slice(1));
  const file = path.resolve(root, requested);
  if (!file.startsWith(root + path.sep)) {
    send(response, 403, "Forbidden");
    return;
  }
  fs.readFile(file, (error, contents) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (indexError, index) => {
        if (indexError) send(response, 404, "Not found");
        else send(response, 200, index, contentTypes[".html"]);
      });
      return;
    }
    send(response, 200, contents, contentTypes[path.extname(file)] || "application/octet-stream");
  });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");

  if (url.pathname === "/api/db" && request.method === "GET") {
    const database = readDatabase();
    if (database == null) send(response, 204, "");
    else send(response, 200, database, contentTypes[".json"]);
    return;
  }

  if (url.pathname === "/api/db" && request.method === "PUT") {
    receiveBody(request, response, body => {
      try {
        writeDatabase(body);
        send(response, 204, "");
      } catch (error) {
        send(response, 400, error.message);
      }
    });
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    send(response, 405, "Method not allowed");
    return;
  }
  serveFile(url.pathname, response);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Disconnected Admin listening on ${port}`);
});
