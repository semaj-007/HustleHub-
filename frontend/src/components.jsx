import { useEffect, useRef } from 'react';
import {
  X,
  AlertCircle,
  LoaderCircle,
  ArrowUpRight,
  Palette,
  Code2,
  PenLine,
  Megaphone,
  BriefcaseBusiness,
  Clock3,
} from 'lucide-react';
import { categories, money } from './api';
export const categoryIcons = {
  design: Palette,
  development: Code2,
  writing: PenLine,
  marketing: Megaphone,
  business: BriefcaseBusiness,
};
export function ErrorNotice({ error }) {
  if (!error) return null;
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={18} />
      <div>
        <strong>{error.message || error}</strong>
        {error.details?.length > 0 && (
          <ul>
            {error.details.map((detail, index) => (
              <li key={index}>{detail.message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={22} /> Loading your next opportunity…
    </div>
  );
}
export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BriefcaseBusiness size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function GigCard({ gig, onSelect }) {
  const Icon = categoryIcons[gig.category] || BriefcaseBusiness;
  return (
    <article className="gig-card">
      <button
        className={`gig-art art-${gig.category}`}
        aria-label={`View ${gig.title}`}
        onClick={() => onSelect(gig)}
      >
        <span className="art-circle circle-one" />
        <span className="art-circle circle-two" />
        <span className="art-label">
          {categories.find((category) => category.id === gig.category)?.label}
        </span>
        <Icon className="art-icon" size={60} strokeWidth={1.3} />
        <span className="art-arrow">
          <ArrowUpRight size={19} />
        </span>
      </button>
      <div className="gig-content">
        <div className="seller">
          <span className="avatar">{gig.freelancerName?.slice(0, 1).toUpperCase()}</span>
          <span>{gig.freelancerName}</span>
          <span className="seller-tag">Independent talent</span>
        </div>
        <h3>
          <button className="text-button" onClick={() => onSelect(gig)}>
            {gig.title}
          </button>
        </h3>
        <p className="gig-description">{gig.description}</p>
        <div className="gig-bottom">
          <span className="delivery">
            <Clock3 size={14} /> {gig.deliveryDays} day{gig.deliveryDays > 1 ? 's' : ''} delivery
          </span>
          <strong>{money(gig.priceCents)}</strong>
        </div>
      </div>
    </article>
  );
}
