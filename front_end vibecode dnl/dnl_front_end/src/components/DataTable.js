function cn(...classes) {
    return classes.filter(Boolean).join(" ");
}

const badgeTones = {
    neutral: "border-slate-200 bg-slate-100 text-slate-700",
    info: "border-sky-200 bg-sky-100 text-sky-700",
    success: "border-emerald-200 bg-emerald-100 text-emerald-700",
    warning: "border-amber-200 bg-amber-100 text-amber-700",
    danger: "border-rose-200 bg-rose-100 text-rose-700",
    violet: "border-violet-200 bg-violet-100 text-violet-700",
};

const actionVariants = {
    neutral: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100",
    primary: "border-sky-200 bg-sky-100 text-sky-700 hover:border-sky-300 hover:bg-sky-200",
    success: "border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-200",
    warning: "border-amber-200 bg-amber-100 text-amber-800 hover:border-amber-300 hover:bg-amber-200",
    danger: "border-rose-200 bg-rose-100 text-rose-700 hover:border-rose-300 hover:bg-rose-200",
};

export function DataTable({ children, className = "", minWidthClassName = "min-w-full", hint = "Swipe to see more columns" }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--border-strong)] bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border-muted)] bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.9))] px-4 py-3 text-xs font-medium text-slate-500">
                <span>Structured view</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    {hint}
                </span>
            </div>
            <div className="overflow-x-auto overscroll-x-contain">
                <table className={cn(minWidthClassName, "divide-y divide-slate-200", className)}>
                    {children}
                </table>
            </div>
        </div>
    );
}

export function HeaderCell({ children, className = "", sortable = false, sortDirection, onClick, align = "left", sublabel }) {
    const alignment = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

    if (sortable) {
        return (
            <th className={cn("sticky top-0 z-10 bg-slate-50/95 px-4 py-3 backdrop-blur", alignment, className)}>
                <button
                    type="button"
                    onClick={onClick}
                    className={cn(
                        "group inline-flex max-w-full items-center gap-2 rounded-full border border-transparent px-2 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-200 hover:bg-white hover:text-slate-900",
                        alignment === "text-right" ? "ml-auto" : ""
                    )}
                >
                    <span className="truncate">{children}</span>
                    <SortIcon direction={sortDirection} active={Boolean(sortDirection)} />
                </button>
                {sublabel ? <div className="mt-1 text-xs font-medium normal-case tracking-normal text-slate-500">{sublabel}</div> : null}
            </th>
        );
    }

    return (
        <th className={cn("sticky top-0 z-10 bg-slate-50/95 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 backdrop-blur", alignment, className)}>
            <div>{children}</div>
            {sublabel ? <div className="mt-1 text-xs font-medium normal-case tracking-normal text-slate-500">{sublabel}</div> : null}
        </th>
    );
}

export function DataBadge({ children, tone = "neutral", icon, className = "" }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", badgeTones[tone] || badgeTones.neutral, className)}>
            {icon}
            <span>{children}</span>
        </span>
    );
}

export function LinkBadge({ href, children, title, tone = "info" }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            title={title}
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                badgeTones[tone] || badgeTones.info,
                "hover:-translate-y-0.5 hover:shadow-sm"
            )}
        >
            <FileIcon className="h-3.5 w-3.5" />
            <span>{children}</span>
        </a>
    );
}

export function ActionButton({ children, icon, variant = "neutral", className = "", ...props }) {
    return (
        <button
            type="button"
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 hover:shadow-sm",
                actionVariants[variant] || actionVariants.neutral,
                className
            )}
            {...props}
        >
            {icon}
            <span>{children}</span>
        </button>
    );
}

export function TableEmptyState({ colSpan, title, description }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-6 py-10 text-center">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                    <div className="rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-400">
                        <EmptyIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-700">{title}</div>
                        {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
                    </div>
                </div>
            </td>
        </tr>
    );
}

export function SortIcon({ direction, active = false }) {
    const base = active ? "text-slate-700" : "text-slate-300 group-hover:text-slate-500";

    if (direction === "asc") {
        return (
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={cn("h-4 w-4", base)}>
                <path fillRule="evenodd" d="M10 5.293l4.146 4.147.708-.708L10 3.879 5.146 8.732l.708.708L10 5.293z" clipRule="evenodd" />
            </svg>
        );
    }

    if (direction === "desc") {
        return (
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={cn("h-4 w-4", base)}>
                <path fillRule="evenodd" d="M10 14.707l-4.146-4.147-.708.708L10 16.121l4.854-4.853-.708-.708L10 14.707z" clipRule="evenodd" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn("h-4 w-4", base)}>
            <path d="M10 4l3 3H7l3-3z" fill="currentColor" opacity="0.7" />
            <path d="M10 16l-3-3h6l-3 3z" fill="currentColor" />
        </svg>
    );
}

export function EditIcon({ className = "h-3.5 w-3.5" }) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M13.586 2.586a2 2 0 112.828 2.828l-8.53 8.53a2 2 0 01-.878.513l-2.602.867a.75.75 0 01-.949-.949l.867-2.602a2 2 0 01.513-.878l8.53-8.53zM12.525 4.707L5.768 11.464a.5.5 0 00-.128.22l-.45 1.35 1.35-.45a.5.5 0 00.22-.128l6.757-6.757-1-1z" />
        </svg>
    );
}

export function DeleteIcon({ className = "h-3.5 w-3.5" }) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
            <path fillRule="evenodd" d="M8.5 2.75A1.75 1.75 0 006.75 4.5V5H4.5a.75.75 0 000 1.5h.568l.73 8.032A2.25 2.25 0 008.04 16.75h3.92a2.25 2.25 0 002.242-2.218l.73-8.032h.568a.75.75 0 000-1.5h-2.25v-.5A1.75 1.75 0 0011.5 2.75h-3zm3.25 2.25v-.5a.25.25 0 00-.25-.25h-3a.25.25 0 00-.25.25V5h3.5z" clipRule="evenodd" />
        </svg>
    );
}

export function DownloadIcon({ className = "h-3.5 w-3.5" }) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M10 2.75a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V3.5A.75.75 0 0110 2.75z" />
            <path d="M4.5 13.25a.75.75 0 01.75.75v.5c0 .414.336.75.75.75h8a.75.75 0 00.75-.75V14a.75.75 0 011.5 0v.5A2.25 2.25 0 0114 16.75H6A2.25 2.25 0 013.75 14.5V14a.75.75 0 01.75-.75z" />
        </svg>
    );
}

export function PaymentIcon({ className = "h-3.5 w-3.5" }) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M3.5 4.75A2.25 2.25 0 015.75 2.5h8.5a2.25 2.25 0 012.25 2.25v1.5H3.5v-1.5z" />
            <path fillRule="evenodd" d="M2.5 8a1 1 0 011-1h13a1 1 0 011 1v5.25a2.25 2.25 0 01-2.25 2.25h-10.5A2.25 2.25 0 012.5 13.25V8zm10.25 2a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5h-1.5z" clipRule="evenodd" />
        </svg>
    );
}

export function FileIcon({ className = "h-3.5 w-3.5" }) {
    return (
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
            <path d="M5.75 2.5A2.25 2.25 0 003.5 4.75v10.5a2.25 2.25 0 002.25 2.25h8.5a2.25 2.25 0 002.25-2.25V8.28a2.25 2.25 0 00-.659-1.591l-3.53-3.53A2.25 2.25 0 0010.72 2.5H5.75z" />
        </svg>
    );
}

function EmptyIcon({ className = "h-5 w-5" }) {
    return (
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className}>
            <path d="M4 5.75A1.75 1.75 0 015.75 4h8.5A1.75 1.75 0 0116 5.75v8.5A1.75 1.75 0 0114.25 16h-8.5A1.75 1.75 0 014 14.25v-8.5z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}