# RgGen Web UI

A browser-based CSR definition tool for [RgGen](https://github.com/rggen/rggen).
No server required — runs entirely in the browser.

## Features

- Define register blocks, registers, and bit fields via an interactive table UI
- Supports indirect registers, array registers, and sequence bit fields
- Project-level config (bus width, address width, protocol)
- Export definitions as RgGen-compatible YAML files (bundled in a ZIP)
- Import previously exported YAML files
- State is preserved across page reloads via localStorage

### Generate (ruby.wasm)

- Run RgGen in-browser via [ruby.wasm](https://github.com/ruby/ruby.wasm) — no server, no install
- Generates RTL (SystemVerilog, Verilog, Veryl, VHDL), RAL, C header, and Markdown docs
- Download all outputs as a ZIP archive
- Error messages are shown in a banner (backtrace hidden)
- When an error references a specific file and line, the offending field is highlighted:
  - Config panel or block settings: the specific input is outlined in red
  - Register / bit field row: the row is highlighted and the specific cell is outlined; the register is auto-expanded and scrolled into view

### YAML Preview

- Preview generated YAML for config and each register block
- Line numbers displayed alongside the YAML text
- One-click copy to clipboard

## Building the WASM

```sh
cd rggen-wasm
bundle install
bash bin/build.sh
cp rggen.wasm ../public/rggen.wasm
```

Requires [ruby_wasm](https://github.com/ruby/ruby.wasm) and a WASI-capable toolchain. See `rggen-wasm/NOTES.md` for details.

## Copyright & License

Copyright &copy; 2026 Taichi Ishitani. RgGen Web UI is licensed under the [MIT License](https://opensource.org/licenses/MIT), see [LICENSE](LICENSE) for further details.
