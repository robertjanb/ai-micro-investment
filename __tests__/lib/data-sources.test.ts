import { resolveDataSource } from '@/lib/data-sources'

describe('resolveDataSource', () => {
  it('uses DATA_SOURCE when set to real', () => {
    expect(resolveDataSource({ DATA_SOURCE: 'real' } as NodeJS.ProcessEnv)).toBe('real')
  })

  it('uses DATA_SOURCE when set to mock', () => {
    expect(resolveDataSource({ DATA_SOURCE: 'mock' } as NodeJS.ProcessEnv)).toBe('mock')
  })

  it('falls back to USE_REAL_DATA=true when DATA_SOURCE is missing', () => {
    expect(resolveDataSource({ USE_REAL_DATA: 'true' } as NodeJS.ProcessEnv)).toBe('real')
  })

  it('falls back to USE_REAL_DATA=false when DATA_SOURCE is missing', () => {
    expect(resolveDataSource({ USE_REAL_DATA: 'false' } as NodeJS.ProcessEnv)).toBe('mock')
  })

  it('prefers DATA_SOURCE when both are set and conflicting', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(
      resolveDataSource({ DATA_SOURCE: 'mock', USE_REAL_DATA: 'true' } as NodeJS.ProcessEnv)
    ).toBe('mock')
    warnSpy.mockRestore()
  })
})
