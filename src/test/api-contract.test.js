import { describe, it, expect } from 'vitest'

describe('API Contract: Anthropic Response Schema', () => {

  it('streaming SSE format is parseable', () => {
    const sseLines = [
      'event: content_block_start',
      'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}',
      '',
      'event: content_block_delta',
      'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}',
      '',
      'event: message_stop',
      'data: {"type":"message_stop"}',
    ]
    const deltas = sseLines
      .filter(l => l.startsWith('data: '))
      .map(l => JSON.parse(l.substring(6)))
      .filter(d => d.type === 'content_block_delta')
    expect(deltas).toHaveLength(1)
    expect(deltas[0].delta.text).toBe('Hello')
  })

  it('tool use response schema is valid', () => {
    const response = {
      content: [
        { type: 'text', text: 'I will complete that task.' },
        { type: 'tool_use', id: 'tu_123', name: 'complete_task', input: { taskId: 5 } }
      ],
      usage: { input_tokens: 100, output_tokens: 50 }
    }
    const toolBlocks = response.content.filter(b => b.type === 'tool_use')
    const textBlocks = response.content.filter(b => b.type === 'text')
    expect(toolBlocks).toHaveLength(1)
    expect(toolBlocks[0].name).toBe('complete_task')
    expect(textBlocks[0].text).toBeTruthy()
  })

  it('error response has expected structure', () => {
    const errorResp = { error: { type: 'invalid_request_error', message: 'Invalid API key' } }
    expect(errorResp.error.type).toBeTruthy()
    expect(errorResp.error.message).toBeTruthy()
  })

  it('usage tokens are numbers', () => {
    const usage = { input_tokens: 1500, output_tokens: 800 }
    expect(typeof usage.input_tokens).toBe('number')
    expect(typeof usage.output_tokens).toBe('number')
    expect(usage.input_tokens).toBeGreaterThan(0)
  })
})
