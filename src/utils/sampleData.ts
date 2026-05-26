import { parseBlockYaml } from './yamlParser';
import type { RegisterBlock } from '../types/rggen';

const SAMPLE_YAML = `
register_blocks:
  - name: block_0
    byte_size: 256
    registers:
    - name: register_0
      bit_fields:
      - { name: bit_field_0, bit_assignment: { width: 4 }, type: rw  , initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { width: 4 }, type: rw  , initial_value: 0 }
      - { name: bit_field_2, bit_assignment: { width: 1 }, type: rw  , initial_value: 0 }
      - { name: bit_field_3, bit_assignment: { width: 2 }, type: w1  , initial_value: 0 }
      - { name: bit_field_4, bit_assignment: { width: 2 }, type: wrc , initial_value: 0 }
      - { name: bit_field_5, bit_assignment: { width: 2 }, type: wrs , initial_value: 0 }
      - { name: bit_field_6, bit_assignment: { width: 2 }, type: rowo, initial_value: 0 }

    - name: register_1
      bit_fields:
      - { bit_assignment: { lsb: 0, width: 1 }, type: rw, initial_value: 0 }

    - name: register_2
      offset_address: 0x08
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 4 }, type: ro }
      - { name: bit_field_1, bit_assignment: { lsb:  8, width: 8 }, type: rof , initial_value: 0xab }
      - { name: bit_field_2, bit_assignment: { lsb: 16, width: 4 }, type: rohw, initial_value: 0 }
      - { name: bit_field_3, bit_assignment: { lsb: 20, width: 4 }, type: rohw, initial_value: 0, reference: register_3.bit_field_3 }
      - { name: bit_field_4, bit_assignment: { lsb: 24, width: 8 }, type: reserved }

    - name: register_3
      offset_address: 0x08
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 4 }, type: wo  , initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb:  4, width: 4 }, type: wo1 , initial_value: 0 }
      - { name: bit_field_2, bit_assignment: { lsb:  8, width: 4 }, type: w0trg }
      - { name: bit_field_3, bit_assignment: { lsb: 16, width: 4 }, type: w1trg }

    - name: register_4
      offset_address: 0x0C
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 4 }, type: rc, initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb:  8, width: 4 }, type: rc, initial_value: 0, reference: register_0.bit_field_0 }
      - { name: bit_field_2, bit_assignment: { lsb: 12, width: 4 }, type: ro, reference: register_4.bit_field_1 }
      - { name: bit_field_3, bit_assignment: { lsb: 16, width: 4 }, type: rs, initial_value: 0 }

    - name: register_5
      offset_address: 0x10
      bit_fields:
      - { name: bit_field_0 , bit_assignment: { lsb:  0, width: 2 }, type: rwc , initial_value: 0 }
      - { name: bit_field_1 , bit_assignment: { lsb:  2, width: 2 }, type: rwc , initial_value: 0, reference: register_3.bit_field_2 }
      - { name: bit_field_2 , bit_assignment: { lsb:  4, width: 2 }, type: rws , initial_value: 0 }
      - { name: bit_field_3 , bit_assignment: { lsb:  6, width: 2 }, type: rws , initial_value: 0, reference: register_3.bit_field_2 }
      - { name: bit_field_4 , bit_assignment: { lsb:  8, width: 2 }, type: rwhw, initial_value: 0 }
      - { name: bit_field_5 , bit_assignment: { lsb: 10, width: 2 }, type: rwhw, initial_value: 0, reference: register_3.bit_field_3 }
      - { name: bit_field_6 , bit_assignment: { lsb: 12, width: 2 }, type: rwe , initial_value: 0 }
      - { name: bit_field_7 , bit_assignment: { lsb: 14, width: 2 }, type: rwe , initial_value: 0, reference: register_0.bit_field_2 }
      - { name: bit_field_8 , bit_assignment: { lsb: 16, width: 2 }, type: rwe , initial_value: 0, reference: register_1 }
      - { name: bit_field_9 , bit_assignment: { lsb: 20, width: 2 }, type: rwl , initial_value: 0 }
      - { name: bit_field_10, bit_assignment: { lsb: 22, width: 2 }, type: rwl , initial_value: 0, reference: register_0.bit_field_2 }
      - { name: bit_field_11, bit_assignment: { lsb: 24, width: 2 }, type: rwl , initial_value: 0, reference: register_1 }

    - name: register_6
      offset_address: 0x14
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 4 }, type: w0c, initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb:  4, width: 4 }, type: w0c, initial_value: 0, reference: register_0.bit_field_0 }
      - { name: bit_field_2, bit_assignment: { lsb:  8, width: 4 }, type: ro , reference: register_6.bit_field_1 }
      - { name: bit_field_3, bit_assignment: { lsb: 12, width: 4 }, type: w1c, initial_value: 0 }
      - { name: bit_field_4, bit_assignment: { lsb: 16, width: 4 }, type: w1c, initial_value: 0, reference: register_0.bit_field_0 }
      - { name: bit_field_5, bit_assignment: { lsb: 20, width: 4 }, type: ro , reference: register_6.bit_field_4 }
      - { name: bit_field_6, bit_assignment: { lsb: 24, width: 4 }, type: w0s, initial_value: 0 }
      - { name: bit_field_7, bit_assignment: { lsb: 28, width: 4 }, type: w1s, initial_value: 0 }
      - { name: bit_field_8, bit_assignment: { lsb: 32, width: 4 }, type: w0t, initial_value: 0 }
      - { name: bit_field_9, bit_assignment: { lsb: 36, width: 4 }, type: w1t, initial_value: 0 }

    - name: register_7
      offset_address: 0x1C
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 4 }, type: w0crs, initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb:  8, width: 4 }, type: w1crs, initial_value: 0 }
      - { name: bit_field_2, bit_assignment: { lsb: 16, width: 4 }, type: w0src, initial_value: 0 }
      - { name: bit_field_3, bit_assignment: { lsb: 24, width: 4 }, type: w1src, initial_value: 0 }

    - name: register_8
      offset_address: 0x20
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 4 }, type: wc  , initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb:  8, width: 4 }, type: ws  , initial_value: 0 }
      - { name: bit_field_2, bit_assignment: { lsb: 16, width: 4 }, type: woc , initial_value: 0 }
      - { name: bit_field_3, bit_assignment: { lsb: 24, width: 4 }, type: wos , initial_value: 0 }
      - { name: bit_field_4, bit_assignment: { lsb: 32, width: 4 }, type: wcrs, initial_value: 0 }
      - { name: bit_field_5, bit_assignment: { lsb: 40, width: 4 }, type: wsrc, initial_value: 0 }

    - name: register_9
      offset_address: 0x28
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 2 }, type: rwtrg  , initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb:  2, width: 2 }, type: rotrg }
      - { name: bit_field_2, bit_assignment: { lsb:  4, width: 2 }, type: wotrg  , initial_value: 0 }
      - { name: bit_field_3, bit_assignment: { lsb:  6, width: 2 }, type: rowotrg, initial_value: 0 }
      - { name: bit_field_4, bit_assignment: { lsb:  8, width: 2 }, type: row0trg }
      - { name: bit_field_5, bit_assignment: { lsb: 10, width: 2 }, type: row1trg }

    - name: register_10
      offset_address: 0x30
      size: [4, step: 8]
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb: 0, width: 2, sequence_size: 4, step: 8 }, type: rw, initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb: 2, width: 2, sequence_size: 4, step: 8 }, type: rw, initial_value: { default: 0 } }
      - { name: bit_field_2, bit_assignment: { lsb: 4, width: 2, sequence_size: 4, step: 8 }, type: rw, initial_value: 0 }

    - name: register_11
      offset_address: 0x50
      size: [2, 4]
      type: [indirect, register_0.bit_field_0, register_0.bit_field_1, [register_0.bit_field_2, 0]]
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 8, sequence_size: 4, step: 16 }, type: rw, initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb:  8, width: 8, sequence_size: 4, step: 16 }, type: rw, initial_value: 0 }

    - name: register_12
      offset_address: 0x50
      type: [indirect, [register_0.bit_field_2, 1]]
      bit_fields:
      - { name: bit_field_0, bit_assignment: { lsb:  0, width: 1 }, type: rw, initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { lsb: 32, width: 1 }, type: rw, initial_value: 0 }

    - name: register_13
      offset_address: 0x60
      bit_fields:
      - { name: bit_field_0, bit_assignment: { width: 2 }, initial_value: 0, type: [custom] }
      - { name: bit_field_1, bit_assignment: { width: 2 }, type: [custom, sw_write: none] }
      - { name: bit_field_2, bit_assignment: { width: 2 }, initial_value: 0, type: [custom, sw_write_once: true] }
      - { name: bit_field_3, bit_assignment: { width: 2 }, initial_value: 0, type: [custom, write_trigger: true, read_trigger: true] }
      - { name: bit_field_4, bit_assignment: { width: 2 }, initial_value: 0, type: [custom, sw_write: set_1, sw_read: clear] }
      - { name: bit_field_5, bit_assignment: { width: 2 }, initial_value: 0, type: [custom, sw_write: clear_1, sw_read: set] }
      - { name: bit_field_6, bit_assignment: { width: 2 }, initial_value: 0, type: [custom, sw_write: set_1, hw_clear: true] }
      - { name: bit_field_7, bit_assignment: { width: 2 }, initial_value: 0, type: [custom, sw_write: clear_1, hw_set: true] }
      - { name: bit_field_8, bit_assignment: { width: 2 }, initial_value: 0, type: [custom, hw_write: true] }

    - name: register_14
      offset_address: 0x64
      bit_fields:
      - { name: bit_field_0, bit_assignment: { width: 8 }, type: counter, initial_value: 0 }
      - { name: bit_field_1, bit_assignment: { width: 8 }, type: counter, initial_value: 0, reference: register_3.bit_field_3 }

    - name: register_15
      offset_address: 0x70
      type: rw
      bit_fields:
      - { name: bit_field_0, bit_assignment: { width: 1 }, type: ro }

    - name: register_16
      offset_address: 0x74
      type: rw
      bit_fields:
      - { name: bit_field_0, bit_assignment: { width: 1 }, type: wo, initial_value: 0 }

    - name: register_17
      offset_address: 0x78
      type: maskable
      bit_fields:
      - { name: bit_field_0, bit_assignment: { width: 16 }, type: rw, initial_value: 0 }

    - name: register_18
      offset_address: 0x7C
      type: reserved

    - name: register_19
      offset_address: 0x80
      size: 32
      type: external
`;

const UART_CSR_YAML = `
register_blocks:
  - name: uart_csr
    byte_size: 32
    comment: 'UART CSR'
    registers:
    - name: rbr
      offset_address: 0x00
      type: [indirect, [lcr.dlab, 0]]
      comment: 'Receiver Buffer Register'
      bit_fields:
      - { bit_assignment: { lsb: 0, width: 8 }, type: rotrg }

    - name: thr
      offset_address: 0x00
      type: [indirect, [lcr.dlab, 0]]
      comment: 'Transmitter Holding Register'
      bit_fields:
      - { bit_assignment: { lsb: 0, width: 8 }, type: wotrg, initial_value: 255 }

    - name: ier
      offset_address: 0x04
      type: [indirect, [lcr.dlab, 0]]
      comment: 'Interrupt Enable Register'
      bit_fields:
      - { name: erbfi,  bit_assignment: { lsb: 0, width: 1 }, type: rw, initial_value: 0, comment: 'Enable Received Data Available Interrupt' }
      - { name: etbei,  bit_assignment: { lsb: 1, width: 1 }, type: rw, initial_value: 0, comment: 'Enable Transmitter Holding Register Empty Interrupt' }
      - { name: elsi,   bit_assignment: { lsb: 2, width: 1 }, type: rw, initial_value: 0, comment: 'Enable Receiver Line Status Interrupt' }
      - { name: edssi,  bit_assignment: { lsb: 3, width: 1 }, type: rw, initial_value: 0, comment: 'Enable Modem Status Interrupt' }

    - name: iir
      offset_address: 0x08
      comment: 'Interrupt Identification Register'
      bit_fields:
      - { name: intpend, bit_assignment: { lsb: 0, width: 1 }, type: ro, comment: '0: Interrupt is pending, 1: No interrupt is pending' }
      - { name: intid2,  bit_assignment: { lsb: 1, width: 3 }, type: ro, comment: 'Interrupt ID' }

    - name: fcr
      offset_address: 0x08
      comment: 'FIFO Control Register'
      bit_fields:
      - { name: fifoen,                  bit_assignment: { lsb: 0, width: 1 }, type: wo,    initial_value: 0, comment: 'FIFO Enable' }
      - { name: rcvr_fifo_reset,         bit_assignment: { lsb: 1, width: 1 }, type: w1trg,                   comment: 'Receiver FIFO Reset' }
      - { name: xmit_fifo_reset,         bit_assignment: { lsb: 2, width: 1 }, type: w1trg,                   comment: 'Transmitter FIFO Reset' }
      - { name: dma_mode_select,         bit_assignment: { lsb: 3, width: 1 }, type: wo,    initial_value: 0, comment: 'DMA Mode Select' }
      - { name: rcvr_fifo_trigger_level, bit_assignment: { lsb: 6, width: 2 }, type: wo,    initial_value: 0, comment: 'RCVR FIFO Trigger Level' }

    - name: lcr
      offset_address: 0x0C
      comment: 'Line Control Register'
      bit_fields:
      - { name: wls,          bit_assignment: { lsb: 0, width: 2 }, type: rw, initial_value: 3, comment: 'Word Length Select' }
      - { name: stb,          bit_assignment: { lsb: 2, width: 1 }, type: rw, initial_value: 0, comment: 'Number of Stop Bits' }
      - { name: pen,          bit_assignment: { lsb: 3, width: 1 }, type: rw, initial_value: 0, comment: 'Parity Enable' }
      - { name: eps,          bit_assignment: { lsb: 4, width: 1 }, type: rw, initial_value: 0, comment: 'Even Parity Select' }
      - { name: stick_parity, bit_assignment: { lsb: 5, width: 1 }, type: rw, initial_value: 0, comment: 'Stick Parity' }
      - { name: set_break,    bit_assignment: { lsb: 6, width: 1 }, type: rw, initial_value: 0, comment: 'Set Break' }
      - { name: dlab,         bit_assignment: { lsb: 7, width: 1 }, type: rw, initial_value: 0, comment: 'Divisor Latch Access Bit' }

    - name: mrc
      offset_address: 0x10
      comment: 'Modem Control Register'
      bit_fields:
      - { name: dtr,       bit_assignment: { lsb: 0, width: 1 }, type: rw, initial_value: 0, comment: 'Data Terminal Ready' }
      - { name: rts,       bit_assignment: { lsb: 1, width: 1 }, type: rw, initial_value: 0, comment: 'Request To Send' }
      - { name: out1,      bit_assignment: { lsb: 2, width: 1 }, type: rw, initial_value: 0, comment: 'User Output 1' }
      - { name: out2,      bit_assignment: { lsb: 3, width: 1 }, type: rw, initial_value: 0, comment: 'User Output 2' }
      - { name: loop_back, bit_assignment: { lsb: 4, width: 1 }, type: rw, initial_value: 0, comment: 'Loop Back' }

    - name: lsr
      offset_address: 0x14
      comment: 'Line Status Register'
      bit_fields:
      - { name: dr,                 bit_assignment: { lsb: 0, width: 1 }, type: ro,    comment: 'Data Ready' }
      - { name: oe,                 bit_assignment: { lsb: 1, width: 1 }, type: rotrg, comment: 'Overrun Error' }
      - { name: pe,                 bit_assignment: { lsb: 2, width: 1 }, type: rotrg, comment: 'Parity Error' }
      - { name: fe,                 bit_assignment: { lsb: 3, width: 1 }, type: rotrg, comment: 'Framing Error' }
      - { name: bi,                 bit_assignment: { lsb: 4, width: 1 }, type: rotrg, comment: 'Break Interrupt' }
      - { name: thre,               bit_assignment: { lsb: 5, width: 1 }, type: ro,    comment: 'Transmitter Holding Register Empty' }
      - { name: temt,               bit_assignment: { lsb: 6, width: 1 }, type: ro,    comment: 'Transmitter Empty' }
      - { name: error_in_rcvr_fifo, bit_assignment: { lsb: 7, width: 1 }, type: ro,    comment: 'RCVR FIFO contains at least one receiver error' }

    - name: msr
      offset_address: 0x18
      comment: 'Modem Status Register'
      bit_fields:
      - { name: dcts, bit_assignment: { lsb: 0, width: 1 }, type: rotrg, comment: 'Delta Clear To Send' }
      - { name: ddsr, bit_assignment: { lsb: 1, width: 1 }, type: rotrg, comment: 'Delta Data Set Ready' }
      - { name: teri, bit_assignment: { lsb: 2, width: 1 }, type: ro,    comment: 'Trailing Edge Ring Indicator' }
      - { name: ddcd, bit_assignment: { lsb: 3, width: 1 }, type: rotrg, comment: 'Delta Data Carrier Detect' }
      - { name: cts,  bit_assignment: { lsb: 4, width: 1 }, type: ro,    comment: 'Clear To Send' }
      - { name: dsr,  bit_assignment: { lsb: 5, width: 1 }, type: ro,    comment: 'Data Set Ready' }
      - { name: ri,   bit_assignment: { lsb: 6, width: 1 }, type: ro,    comment: 'Ring Indicator' }
      - { name: dcd,  bit_assignment: { lsb: 7, width: 1 }, type: ro,    comment: 'Data Carrier Detect' }

    - name: scratch
      offset_address: 0x1c
      comment: 'Scratch Register'
      bit_fields:
      - { bit_assignment: { lsb: 0, width: 8 }, type: rw, initial_value: 0 }

    - name: dll
      offset_address: 0x00
      type: [indirect, [lcr.dlab, 1]]
      comment: 'Divisor Latch (Least Significant Byte) Register'
      bit_fields:
      - { bit_assignment: { lsb: 0, width: 8 }, type: rw, initial_value: { default: 0 } }

    - name: dlm
      offset_address: 0x04
      type: [indirect, [lcr.dlab, 1]]
      comment: 'Divisor Latch (Most Significant Byte) Register'
      bit_fields:
      - { bit_assignment: { lsb: 0, width: 8 }, type: rw, initial_value: { default: 0 } }
`;

export function createSampleBlocks(): RegisterBlock[] {
  return parseBlockYaml(SAMPLE_YAML);
}

export function createUartCsrBlocks(): RegisterBlock[] {
  return parseBlockYaml(UART_CSR_YAML);
}
