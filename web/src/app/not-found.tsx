import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <p>There is nothing at this address. Work order ids look like wo_3; playbooks live under skills/.</p>
      <Link href="/" className="btn btn-quiet">
        Back to the desk
      </Link>
    </div>
  );
}
