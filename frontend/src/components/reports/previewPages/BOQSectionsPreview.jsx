import React from 'react';

const BOQSectionsPreview = ({ sections }) => {
  if (!sections?.length) return null;

  return (
    <div className="border p-3">
      <h4 className="font-semibold mb-2">Progress by Section</h4>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th>Section</th>
            <th>Total</th>
            <th>Completed</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s, i) => (
            <tr key={i}>
              <td>{s.sectionNumber} - {s.title}</td>
              <td>{s.totalItems}</td>
              <td>{s.completedItems}</td>
              <td>{s.progress}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BOQSectionsPreview;
