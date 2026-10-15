import React from "react";
export const FullTable = ({
  children,
  variant = "default"
}: {
  children: React.ReactNode;
  variant?: "default" | "categorized";
}) => {
  return <div className={`w-full min-w-[248px] relative ${variant === "categorized" ? "no-scrollbar overflow-x-auto" : "overflow-auto rounded-lg p-6 border border-gray-alpha-400 bg-white"}`}>
      <table className={`w-full border-collapse text-sm font-sans ${variant === "categorized" ? "text-foreground" : "text-gray-900"}`}>
        {children}
      </table>
    </div>;
};
FullTable.Colgroup = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return <colgroup>{children}</colgroup>;
};
FullTable.Col = ({
  className
}: {
  className?: string;
}) => {
  return <col className={className} />;
};
FullTable.Header = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return <thead className="border-b border-border">{children}</thead>;
};
FullTable.Body = ({
  children,
  striped,
  interactive,
  virtualize
}: {
  children: React.ReactNode;
  striped?: boolean;
  interactive?: boolean;
  virtualize?: boolean;
}) => {
  return <>
      <tbody className={`${striped ? "[&_tr:where(:nth-child(odd))]:bg-background-200" : ""}${interactive ? " [&_tr:hover]:bg-secondary/60" : ""}`}>
        {children}
      </tbody>
    </>;
};
FullTable.Row = ({
  children,
  isTotal,
  isCategory,
  className,
  onClick
}: {
  children: React.ReactNode;
  isTotal?: boolean;
  isCategory?: boolean;
  className?: string;
  onClick?: () => void;
}) => {
  return <tr className={`transition-colors ${isCategory ? 'border-t border-border [&_td]:py-3 [&_td]:font-medium' : ''} ${isTotal ? 'border-t border-foreground [&_td]:py-3' : ''} ${className || ''}`} onClick={onClick}>{children}</tr>;
};
FullTable.Head = ({
  children,
  className
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return <th className={`h-9 px-2 align-middle text-left text-[12px] font-normal text-muted-foreground ${className || ""}`}>{children}</th>;
};
FullTable.Cell = ({
  children,
  className,
  colSpan
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) => {
  return <td className={`px-2 py-1.5 align-middle ${className || ""}`} colSpan={colSpan}>{children}</td>;
};
FullTable.Footer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return <tfoot className="border-t border-gray-alpha-400">{children}</tfoot>;
};