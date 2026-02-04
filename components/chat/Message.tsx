interface MessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function Message({ role, content }: MessageProps) {
  return (
    <div
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
          role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}
      >
        {content}
      </div>
    </div>
  )
}
