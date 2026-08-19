import { NotFoundPanel } from '@/components/NotFoundPanel';

export default function AuthorityNotFound() {
  return (
    <NotFoundPanel
      title="Nobody on the register by that name."
      blurb="This official does not appear on any commitment yet. People are added here only when they are named in a source alongside a promise."
    />
  );
}
