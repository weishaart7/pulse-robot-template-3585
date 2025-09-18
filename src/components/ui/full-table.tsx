import React from "react";

export const FullTable = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full overflow-auto min-w-[248px] p-6 rounded-lg relative border border-gray-alpha-400 bg-background-100">
      <table className="w-full border-collapse text-sm font-sans text-gray-900">
        {children}
      </table>
    </div>
  );
};

FullTable.Colgroup = ({ children }: { children: React.ReactNode }) => {
  return <colgroup>{children}</colgroup>;
};

FullTable.Col = ({ className }: { className?: string }) => {
  return <col className={className} />;
};

FullTable.Header = ({ children }: { children: React.ReactNode }) => {
  return <thead className="border-b border-gray-alpha-400">{children}</thead>;
};

FullTable.Body = ({ children, striped, interactive, virtualize }: {
  children: React.ReactNode,
  striped?: boolean,
  interactive?: boolean,
  virtualize?: boolean
}) => {
  return (
    <>
      <tbody className="table-row h-3" />
      <tbody className={`${striped ? "[&_tr:where(:nth-child(odd))]:bg-background-200" : ""}${interactive ? " [&_tr:hover]:bg-gray-100" : ""}`}>
        {children}
      </tbody>
    </>
  );
};

FullTable.Row = ({ children, isTotal, className }: { children: React.ReactNode, isTotal?: boolean, className?: string }) => {
  return <tr className={`[&_td:first-child]:rounded-l-[4px] [&_td:last-child]:rounded-r-[4px] transition-colors ${isTotal ? 'border-t border-t-border/30 [&_td]:pt-5' : ''} ${className || ''}`}>{children}</tr>;
};

FullTable.Head = ({ children }: { children: React.ReactNode }) => {
  return <th className="h-8 px-2 align-middle font-medium text-left last:text-right">{children}</th>;
};

FullTable.Cell = ({ children, className, colSpan }: { children: React.ReactNode, className?: string, colSpan?: number }) => {
  return <td className={`px-2 py-1.5 align-middle last:text-right ${className || ""}`} colSpan={colSpan}>{children}</td>;
};

FullTable.Footer = ({ children }: { children: React.ReactNode }) => {
  return <tfoot className="border-t border-gray-alpha-400">{children}</tfoot>;
};