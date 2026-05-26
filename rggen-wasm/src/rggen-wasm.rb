begin
  require '/bundle/setup'
rescue LoadError
  require 'bundler/setup'
end

require 'rubygems'
require 'json'
require 'base64'
require 'fileutils'
require 'rggen/core'

# @bjorn3/browser_wasi_shim doesn't set file permissions on creation,
# so File.readable? always returns false. Patch it to use File.exist?.
class ::File
  def self.readable?(file_name)
    exist?(file_name)
  end
end

module RgGen
  module WASM
    class << self
      def init
        builder = RgGen::Core::Builder.create

        plugins = [
          'rggen/default_register_map.rb',
          'rggen/systemverilog/rtl.rb',
          'rggen/systemverilog/ral.rb',
          'rggen/verilog.rb',
          'rggen/veryl.rb',
          'rggen/vhdl.rb',
          'rggen/c_header.rb',
          'rggen/markdown.rb'
        ]
        builder.load_plugins(plugins, true)
        builder.enable_all

        @builder = builder
      end

      def run(work_dir, input)
        maps_dir = File.join(work_dir, 'maps')
        out_dir = File.join(work_dir, 'out')

        FileUtils.rm_rf(work_dir)
        FileUtils.mkdir_p(work_dir)
        FileUtils.mkdir_p(maps_dir)
        FileUtils.mkdir_p(out_dir)

        json = JSON.load(Base64.decode64(input))
        config = load_config(work_dir, json)
        maps = load_register_maps(maps_dir, config, json)

        generate_files(out_dir, config, maps)

        nil
      rescue ScriptError, StandardError => e
        RgGen::Core::Utility::ErrorUtility.compose_error_message(e, true, true)
      end

      def collect_outputs(work_dir)
        outputs = Dir.glob(File.join(work_dir, 'out', '**', '*')).each_with_object({}) do |file, hash|
          next unless File.file?(file)
          basename = File.basename(file)
          hash[basename] = File.read(file)
        end
        Base64.encode64(outputs.to_json)
      end

      private

      attr_reader :builder

      def load_config(work_dir, json)
        path = write_file(work_dir, 'config.yaml', json['config'])
        builder
          .build_factory(:input, :configuration)
          .create([path])
      end

      def load_register_maps(maps_dir, config, json)
        paths = json['register_maps'].map do |register_map|
          write_file(maps_dir, "#{register_map['name']}.yaml", register_map['yaml'])
        end
        builder
          .build_factory(:input, :register_map)
          .create(config, paths)
      end

      def write_file(work_dir, file_name, contents)
        path = File.join(work_dir, file_name)
        File.write(path, contents)
        path
      end

      def generate_files(out_dir, config, register_maps)
        builder.build_factories(:output, []).each do |factory|
          factory.create(config, register_maps).write_file(out_dir)
        end
      end
    end
  end
end

RgGen::WASM.init

if $0 == __FILE__
  work_dir = ARGV[0]
  config = ARGV[1]
  register_map = ARGV[2]

  hash = {}
  hash['config'] = File.read(config)
  hash['register_maps'] = []
  hash['register_maps'] << { name: File.basename(register_map, '.*'), yaml: File.read(register_map) }

  input = Base64.encode64(hash.to_json)
  error = RgGen::WASM.run(work_dir, input)
  abort error if error

  outputs = RgGen::WASM.collect_outputs(work_dir)
  JSON.load(Base64.decode64(outputs)).each do |path, contents|
    File.write(path, contents)
  end
end
