const mappedHeaders = ['EmployeeID', 'Name', 'Department', 'Date', 'Day', 'Check In', 'Check Out', 'Status', 'Notes'];
const rowArray = ['EMP-1001', 'Omar Admin', '', '2026-04-21', 'Tuesday', '17:05', '20:00', '', ''];

const getVal = (possibleKeys, exclusive = false) => {
    const index = mappedHeaders.findIndex(h => {
        const cleanH = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
        return possibleKeys.some(pk => {
            const cleanPk = pk.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (exclusive) return cleanH === cleanPk;
            return cleanH.includes(cleanPk) || cleanPk.includes(cleanH);
        });
    });
    return index !== -1 ? rowArray[index] : undefined;
};

const empId = getVal(['EmployeeID', 'ID', 'EmployeeId', 'EmpID'], false);
const name = getVal(['Name', 'EmployeeName', 'Employee'], true);

console.log('empId:', empId);
console.log('name:', name);
