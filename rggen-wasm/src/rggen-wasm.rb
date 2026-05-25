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
      def run(work_dir, input)
        args = []
        args << '--no-default-plugins'
        args << '--plugin' << 'rggen/default_register_map.rb'
        args << '--plugin' << 'rggen/systemverilog/rtl.rb'
        args << '--plugin' << 'rggen/systemverilog/ral.rb'
        args << '--plugin' << 'rggen/verilog.rb'
        args << '--plugin' << 'rggen/veryl.rb'
        args << '--plugin' << 'rggen/vhdl.rb'
        args << '--plugin' << 'rggen/c_header.rb'
        args << '--plugin' << 'rggen/markdown.rb'
        args << '-o'       << File.join(work_dir, 'out')

        maps_dir = File.join(work_dir, 'maps')

        FileUtils.rm_rf(work_dir)
        FileUtils.mkdir_p(work_dir)
        FileUtils.mkdir_p(maps_dir)

        json = JSON.load(Base64.decode64(input))
        write_file(work_dir, 'config.yaml', json['config']).then do |path|
          args << '-c' << path
        end
        json['register_maps'].each do |register_map|
          args << write_file(maps_dir, "#{register_map['name']}.yaml", register_map['yaml'])
        end

        cli = RgGen::Core::CLI.new
        cli.run(args)

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

      def write_file(work_dir, file_name, contents)
        path = File.join(work_dir, file_name)
        File.write(path, contents)
        path
      end
    end
  end
end

if $0 == __FILE__
  work_dir = ARGV[0]
  config = ARGV[1]
  register_map = ARGV[2]

  hash = {}
  hash['config'] = File.read(config)
  hash['register_maps'] = []
  hash['register_maps'] << { name: File.basename(register_map, '.*'), yaml: File.read(register_map) }

  input = Base64.encode64(hash.to_json)
  RgGen::WASM.run(work_dir, input)

  outputs = RgGen::WASM.collect_outputs(work_dir)
  JSON.load(Base64.decode64(outputs)).each do |path, contents|
    File.write(path, contents)
  end
end
