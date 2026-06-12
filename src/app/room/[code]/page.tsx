import { RoomPage } from "@/components/room/room-page";

export default async function Room({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <RoomPage code={code} />;
}
