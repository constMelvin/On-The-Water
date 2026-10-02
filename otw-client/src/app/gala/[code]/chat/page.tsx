import { Chat } from '@/components/gala/chat/Chat';

interface ChatPageProps {
  params: Promise<{ code: string }>;
}

/** Chismis (group chat) tab. The gala code keys the chat slice. */
export default async function ChatPage({ params }: ChatPageProps) {
  const { code } = await params;
  let decoded = code;
  try {
    decoded = decodeURIComponent(code);
  } catch {
    /* keep the raw segment */
  }
  return <Chat code={decoded} />;
}
