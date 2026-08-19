import { NotFoundPanel } from '@/components/NotFoundPanel';

export default function PromiseNotFound() {
  return (
    <NotFoundPanel
      title="No such promise."
      blurb="Nothing on this register is ever deleted, so this is a wrong address rather than a removed record. Search the register for the wording you remember."
    />
  );
}
