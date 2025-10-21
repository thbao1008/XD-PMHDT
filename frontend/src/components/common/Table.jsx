// src/components/common/Table.jsx
import React from "react";

export default function Table({ columns = [], data = [], rowKey = "id", renderRowActions }) {
  return (
    <div className="card">
      <table className="table" role="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.title}</th>
            ))}
            {renderRowActions && <th style={{width:120}}>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (renderRowActions ? 1 : 0)} style={{padding:20, textAlign:"center"}}>Không có dữ liệu</td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row[rowKey]}>
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.dataIndex], row) : row[col.dataIndex]}
                  </td>
                ))}
                {renderRowActions && <td>{renderRowActions(row)}</td>}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
