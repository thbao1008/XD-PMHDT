export default function Modal({open,children}){ return open ? <div className="modal">{children}</div> : null; }
