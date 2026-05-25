# rggen-wasm Build Notes

## ビルド手順

```bash
bundle exec rbwasm build --ruby-version 4.0 --build-profile full -o rggen.wasm
bundle exec rbwasm pack rggen.wasm --dir ./src::/src -o rggen.wasm
```

生成された `rggen.wasm` を `../public/rggen.wasm` にコピーして Vite dev server / ビルド成果物から参照する。
`rggen.wasm` は git 管理しない（`.gitignore` 追加済み）。

---

## ブラウザでの組み込み方法

### VM の生成方針

`@ruby/wasm-wasi` の `DefaultRubyVM` を使用する。

- **WebAssembly.Module**（コンパイル済みモジュール）は初回のみ `fetch` + `compileStreaming` してキャッシュする
- **VM インスタンス**は Generate を実行するたびに新規作成する（Ruby の状態が残留しないようにするため）

```typescript
// モジュールをキャッシュ
const mod = await WebAssembly.compileStreaming(fetch(`${BASE_URL}rggen.wasm`));

// VM は毎回新規作成
const { DefaultRubyVM } = await import('@ruby/wasm-wasi/dist/browser');
const { vm } = await DefaultRubyVM(mod);
vm.eval(`require '/src/rggen-wasm.rb'`);
```

---

## 入出力仕様（Base64 JSON 方式）

### 採用理由

`DefaultRubyVM` は WASI の仮想 FS を内部で管理しており、JS 側から直接ファイルオブジェクトを操作する API を公開していない。
そのため、入力ファイルの内容を文字列として Ruby に渡し、Ruby 側で仮想 FS に書き込む方針を採用した。

エンコード方式として Base64 + JSON を選んだ理由は、`vm.eval()` の引数が Ruby コードの文字列であるため、
マルチバイト文字や改行を含む YAML を直接埋め込むと quote のエスケープ処理が煩雑になるためである。

### JS → Ruby（入力）

JS 側で生成した YAML 文字列を JSON にまとめ、Base64 エンコードして Ruby に渡す。

```typescript
const inputObj = {
  config: generateConfigYaml(config),          // config.yaml の内容
  register_maps: blocks.map(b => ({
    name: b.name || 'block',
    yaml: generateBlockYaml(b),                // block YAML の内容
  })),
};
const inputB64 = btoa(unescape(encodeURIComponent(JSON.stringify(inputObj))));

vm.eval(`RgGen::WASM.run('/work', '${inputB64}')`);
```

Ruby 側では Base64 デコード → JSON パース → `/work/` 以下にファイルを書き込んでから rggen CLI を実行する。

```ruby
def self.run(work_dir, input)
  json = JSON.load(Base64.decode64(input))
  # json['config']          → config.yaml の内容
  # json['register_maps']   → [{ name:, yaml: }, ...]
  # ファイルに書き出して rggen CLI に渡す
end
```

### Ruby → JS（出力）

rggen が出力したファイルを Ruby 側で読み込み、`{ ファイル名 => 内容 }` の JSON を Base64 エンコードして返す。

```ruby
def self.collect_outputs(work_dir)
  outputs = Dir.glob(File.join(work_dir, 'out', '**', '*')).each_with_object({}) do |file, hash|
    next unless File.file?(file)
    hash[File.basename(file)] = File.read(file)
  end
  Base64.encode64(outputs.to_json)
end
```

JS 側で Base64 デコード → JSON パースして ZIP に詰める。

```typescript
const outputsB64 = vm.eval("RgGen::WASM.collect_outputs('/work')").toString();
const outputs: Record<string, string> = JSON.parse(atob(outputsB64));
```

### エラーハンドリング

Ruby 側で `rescue ScriptError, StandardError` して
`RgGen::Core::Utility::ErrorUtility.compose_error_message` で整形した文字列を返す。
成功時は `nil` を返す。

JS 側は `result?.toString()` が `"nil"` 以外の文字列であればエラーとして扱う。
エラーメッセージの 1 行目のみバナーに表示し、バックトレースは非表示にする。

```
-- filename: /work/maps/block_0.yaml line 12 column 5
```

上記フォーマットを検出した場合、対応する UI 要素をハイライトする（`useRgGenWasm.ts` 参照）。

---

## File.readable? パッチ

`@bjorn3/browser_wasi_shim` は WASI ファイル作成時にパーミッションビットを設定しないため、
Ruby の `File.readable?` が常に `false` を返す。
rggen 内部でファイルの読み取り可否チェックに `File.readable?` を使用しているため、これをパッチする。

```ruby
class ::File
  def self.readable?(file_name)
    exist?(file_name)
  end
end
```

このパッチは `src/rggen-wasm.rb` の先頭付近に記述している。

---

## WASI FS を使った代替実装（参考）

`DefaultRubyVM` を使わず、`@bjorn3/browser_wasi_shim` の API を直接操作することで、
入出力を Base64 エンコードせずにファイルとして受け渡す方法もある。

### 実装イメージ

```javascript
import { RubyVM } from '@ruby/wasm-wasi';
import {
  WASI, File as WasiFile, OpenFile, PreopenDirectory, ConsoleStdout,
} from '@bjorn3/browser_wasi_shim';

// 入力ファイルを WasiFile として FS に直接マウント
const workFiles = new Map([
  ['config.yaml', new WasiFile(new TextEncoder().encode(configYaml))],
  ...blocks.map(b => [`${b.name}.yaml`, new WasiFile(new TextEncoder().encode(blockYaml))]),
]);
const preopen = new PreopenDirectory('/work', workFiles);

const fds = [
  new OpenFile(new WasiFile([])),
  ConsoleStdout.lineBuffered(line => console.log(line)),
  ConsoleStdout.lineBuffered(line => console.error(line)),
  preopen,
];
const wasi = new WASI(['ruby.wasm'], [], fds);

// VM の手動組み立て
const vm = new RubyVM();
const imports = { wasi_snapshot_preview1: wasi.wasiImport };
vm.addToImports(imports);
const instance = await WebAssembly.instantiate(mod, imports);
await vm.setInstance(instance);
wasi.initialize(instance);
vm.initialize();

vm.eval(`require '/src/rggen-wasm.rb'`);
vm.eval(`RgGen::WASM.run('/work')`);

// 出力ファイルを FS から直接読む（再帰的に走査）
function collectFiles(dir, prefix = '') {
  const result = {};
  for (const [name, entry] of dir.contents) {
    if (entry instanceof WasiFile) {
      result[prefix + name] = new TextDecoder().decode(entry.data);
    } else {
      Object.assign(result, collectFiles(entry, prefix + name + '/'));
    }
  }
  return result;
}
const outputs = collectFiles(preopen.dir.contents.get('out'));
```

この場合、`rggen-wasm.rb` の `run` メソッドは Base64/JSON のデコードが不要になり、
`collect_outputs` メソッドも不要になる。

### 現行実装（Base64 JSON）との比較

| 観点 | Base64 JSON（現行） | WASI FS 直接操作 |
|---|---|---|
| JS 初期化コード | `DefaultRubyVM` で簡潔 | WASI を手動組み立てするため煩雑 |
| Ruby コード | `collect_outputs` 等のボイラープレートあり | ファイル操作のみでシンプル |
| Base64 encode/decode | あり（ただしオーバーヘッドは無視できる） | なし |
| `@bjorn3/browser_wasi_shim` への依存 | 間接的（DefaultRubyVM 経由） | 内部 API（`dir.contents` 等）を直接使用 |
| 出力ディレクトリ作成 | Ruby 側で `FileUtils.mkdir_p` | 事前に `PreopenDirectory` として定義が必要 |

ファイルサイズが小さい（入力数KB、出力数十KB）ため Base64 のオーバーヘッドは実質ゼロ。
現行実装で問題が生じなければ変更する必要はない。

---

## CI フロー

1. `rggen-wasm/` で `bash bin/build.sh` を実行して `rggen.wasm` をビルド
2. `rggen.wasm` を `dist/` にコピー
3. `dist/` を GitHub Pages にデプロイ（`.github/workflows/deploy.yml` 参照）

ビルドキャッシュ: `rubies/` と `build/` を `Gemfile.lock` のハッシュでキャッシュする。
