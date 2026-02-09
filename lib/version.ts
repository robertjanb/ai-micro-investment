import pkg from '@/package.json'

export function getAppVersionLabel(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.APP_VERSION ||
    pkg.version ||
    'dev'

  const sha =
    process.env.NEXT_PUBLIC_GIT_SHA ||
    process.env.GIT_SHA ||
    process.env.GITHUB_SHA ||
    ''

  return sha ? `${base}-${sha.slice(0, 7)}` : base
}
