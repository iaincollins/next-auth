const fs = require("fs-extra")
const path = require("path")

const MODULE_ENTRIES = {
  SERVER: "index",
  REACT: "react",
  PROVIDERS: "providers",
  ADAPTERS: "adapters",
  JWT: "jwt",
}

// Building submodule entries

const BUILD_TARGETS = {
  [`${MODULE_ENTRIES.SERVER}.js`]:
    "module.exports = require('./dist/server').default\n",
  [`${MODULE_ENTRIES.REACT}.js`]:
    "module.exports = require('./dist/client/react').default\n",
  [`${MODULE_ENTRIES.PROVIDERS}.js`]:
    "module.exports = require('./dist/providers').default\n",
  [`${MODULE_ENTRIES.JWT}.js`]:
    "module.exports = require('./dist/lib/jwt').default\n",
}

Object.entries(BUILD_TARGETS).forEach(([target, content]) => {
  fs.writeFile(path.join(process.cwd(), target), content, (err) => {
    if (err) throw err
    console.log(`[build] created "${target}" in root folder`)
  })
})

// Building types

const TYPES_TARGETS = [
  `${MODULE_ENTRIES.SERVER}.d.ts`,
  `${MODULE_ENTRIES.REACT}-client.d.ts`,
  `${MODULE_ENTRIES.ADAPTERS}.d.ts`,
  `${MODULE_ENTRIES.PROVIDERS}.d.ts`,
  `${MODULE_ENTRIES.JWT}.d.ts`,
  "internals",
]

TYPES_TARGETS.forEach((target) => {
  fs.copy(
    path.resolve("types", target),
    path.join(
      process.cwd(),
      target.startsWith("react-client") ? "react.d.ts" : target
    ),
    (err) => {
      if (err) throw err
      console.log(`[build-types] copying "${target}" to root folder`)
    }
  )
})

// Building providers

const providersDir = path.join(process.cwd(), "/src/providers")

const files = fs
  .readdirSync(providersDir, "utf8")
  .filter((file) => file !== "index.js")

let importLines = ""
let exportLines = `export default {\n`
files.forEach((file) => {
  const provider = fs.readFileSync(path.join(providersDir, file), "utf8")
  try {
    // NOTE: If this fails, the default export probably wasn't a named function.
    // Always use a named function as default export.
    // Eg.: export default function YourProvider ...
    const { functionName } = provider.match(
      /export default function (?<functionName>.+)\s?\(/
    ).groups

    importLines += `import ${functionName} from "./${file}"\n`
    exportLines += `  ${functionName},\n`
  } catch (error) {
    console.error(
      [
        `\nThe provider file '${file}' should have a single named default export`,
        "Example: 'export default function YourProvider'\n\n",
      ].join("\n")
    )
    process.exit(1)
  }
})
exportLines += `}\n`

fs.writeFile(
  path.join(process.cwd(), "src/providers/index.js"),
  [importLines, exportLines].join("\n")
)
