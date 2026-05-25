# rggen-wasm Build Notes

## ビルド手順

```bash
bundle exec rbwasm build --ruby-version 4.0 --build-profile full -o rggen.wasm
bundle exec rbwasm pack rggen.wasm --dir ./src::/src -o rggen.wasm
```

## 動作確認コマンド（wasmtime）

```bash
wasmtime run --dir .::/ rggen.wasm /src/rggen-wasm.rb -o /out -c /config.yml /block_0.yml
```

- `/src/rggen-wasm.rb` がエントリーポイント（`./src/` をパックして `/src` にマウント）
- `-o /out` で出力先ディレクトリを指定
- `-c /config.yml` で config ファイルを指定
- 最後の引数がブロック YAML ファイル

## ブラウザ（@ruby/wasm-wasi）での実行イメージ

Ruby側は `RgGen::WASM.run` として実装済み。ファイル管理はすべてJS側で行う。

### Ruby インターフェース（src/rggen-wasm.rb）

```ruby
module RgGen
  module WASM
    def self.run(out_dir, config, register_maps, *opt_args)
      # ... プラグイン読み込み + CLI 実行
      nil  # 成功時は nil
    rescue ScriptError, StandardError => e
      RgGen::Core::Utility::ErrorUtility.compose_error_message(e, true, true)
      # 失敗時は rggen が整形したエラーメッセージ文字列を返す
    end
  end
end
```

- 引数: `out_dir`, `config`（config.yml パス）, `register_maps`（ブロック YAML パスの配列）, `*opt_args`
- 成功時: `nil` を返す
- 失敗時: `RgGen::Core::Utility::ErrorUtility.compose_error_message` で整形されたエラーメッセージ文字列を返す

### JS 側の呼び出し例

```javascript
// JS側：YAML生成（yamlGenerator.ts）→ 仮想FSに書き込む
writeFile('/work/config.yml', generateConfigYaml(config));
blocks.forEach(b => writeFile(`/work/${b.name}.yml`, generateBlockYaml(b)));

// Ruby メソッド呼び出し（戻り値で成功/失敗を判別）
const blockPaths = blocks.map(b => `/work/${b.name}.yml`);
const result = vm.eval(
  `require '/src/rggen-wasm.rb'; RgGen::WASM.run('/work/out', '/work/config.yml', ${JSON.stringify(blockPaths)})`
);
if (result) throw new Error(result);  // result がエラーメッセージ文字列

// JS側：出力ファイルを読み出してZIPに詰める（JSZip）
const outputFiles = listFiles('/work/out/');
outputFiles.forEach(f => zip.file(f, readFile(`/work/out/${f}`)));
```

### エラーハンドリング方針

Ruby 側で rescue 済みのため、JS 側では戻り値が nil（成功）か文字列（エラーメッセージ）かで判別するだけでよい。
Ruby 例外を rescue せずそのまま JS に伝播させた場合、`@ruby/wasm-wasi` の実装次第でバックトレースが含まれるかどうかが変わるため、Ruby 側で明示的にハンドリングする方針とする。

### 動作確認コマンド（wasmtime）

```bash
wasmtime run rggen.wasm -e "require '/src/rggen-wasm.rb'; RgGen::WASM.run(nil, nil, nil, '--verbose-version')"
```

## CI フロー（予定）

1. このディレクトリで上記コマンドを実行し `rggen.wasm` をビルド
2. `rggen.wasm`（約60MB）を `../dist/` にコピー
3. `dist/` を GitHub Pages にデプロイ

UI側は `fetch('/rggen.wasm')` でランタイムに取得する。
`rggen.wasm` はgit管理しない（`.gitignore` に追加済み）。
