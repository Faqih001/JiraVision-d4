const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "app", "(marketing)")
const files = []
;(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (entry.name.endsWith(".tsx")) files.push(p)
  }
})(root)

let changed = 0
for (const file of files) {
  const src = fs.readFileSync(file, "utf8")
  const out = src
    .split("\n")
    .filter(
      (line) =>
        !/^\s*import \{ Main(Navbar|Footer) \} from "@\/components\/main-(navbar|footer)"\s*$/.test(line) &&
        !/^\s*<(MainNavbar|MainFooter)\s*\/>\s*$/.test(line),
    )
    .join("\n")
  if (out !== src) {
    fs.writeFileSync(file, out)
    changed++
    console.log("stripped:", path.relative(".", file))
  }
}
console.log(`done, ${changed} files changed`)
