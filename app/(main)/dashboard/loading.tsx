export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-28 app-card animate-pulse" />
      <div className="h-10 app-card animate-pulse" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 app-card animate-pulse" />
        <div className="h-48 app-card animate-pulse" />
      </div>
      <div className="h-40 app-card animate-pulse" />
    </div>
  )
}
