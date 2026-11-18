import { EmptyState } from "./Shell";

export function EventUnavailable({ message }: { message: string }) {
  return (
    <EmptyState title="Event evidence unavailable">
      <p role="alert" className="break-words">
        {message}
      </p>
    </EmptyState>
  );
}
