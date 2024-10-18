import { assert, describe, test } from 'matchstick-as'
import { convertChoice, toChecksumAddress } from '../src/helpers'
import { log } from '@graphprotocol/graph-ts'

describe('toChecksumAddress', () => {
  test('converts all upper addresses to checksum addresses', () => {
    assert.stringEquals(
      toChecksumAddress('0x52908400098527886e0f7030069857d2e4169ee7'),
      '0x52908400098527886E0F7030069857D2E4169EE7'
    )
    assert.stringEquals(
      toChecksumAddress('0x8617e340b3d01fa5f11f306f4090fd50e238070d'),
      '0x8617E340B3D01FA5F11F306F4090FD50E238070D'
    )
  })

  test('converts all lower addresses to checksum addresses', () => {
    assert.stringEquals(
      toChecksumAddress('0xde709f2102306220921060314715629080e2fb77'),
      '0xde709f2102306220921060314715629080e2fb77'
    )
    assert.stringEquals(
      toChecksumAddress('0x27b1fdb04752bbc536007a920d24acb045561c26'),
      '0x27b1fdb04752bbc536007a920d24acb045561c26'
    )
  })

  test('converts regular addresses to checksum addresses', () => {
    assert.stringEquals(
      toChecksumAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'),
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
    )
    assert.stringEquals(
      toChecksumAddress('0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359'),
      '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359'
    )
    assert.stringEquals(
      toChecksumAddress('0xdbf03b407c01e7cd3cbea99509d93f8dddc8c6fb'),
      '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB'
    )
    assert.stringEquals(
      toChecksumAddress('0xd1220a0cf47c7b9be7a2e6ba89f429762e7b9adb'),
      '0xD1220A0cf47c7B9Be7A2E6BA89F429762e7b9aDb'
    )
  })
})

describe('convertChoice', () => {
  test('converts raw choice values to common format', () => {
    // Against
    assert.i32Equals(convertChoice(0), 2)
    // For
    assert.i32Equals(convertChoice(1), 1)
    // Abstain
    assert.i32Equals(convertChoice(2), 3)
  })

  test('returns -1 for unknown choice values', () => {
    assert.i32Equals(convertChoice(10), -1)
  })
})
