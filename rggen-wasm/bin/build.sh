# /bin/bash

bundle exec rbwasm build --ruby-version 4.0 --build-profile full -o rggen.wasm
bundle exec rbwasm pack rggen.wasm --dir ./src::/src -o rggen.wasm
