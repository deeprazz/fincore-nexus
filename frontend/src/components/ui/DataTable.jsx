import React from "react";

export function DataTable({ headers = [], children, emptyMessage = "No data to display." }) {
  return (
    <div className="table-wrap">
      <table>
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {children || (
            <tr>
              <td colSpan={headers.length || 1} className="empty-state">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
