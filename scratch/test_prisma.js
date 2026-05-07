const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing Employee query...');
        const employees = await prisma.employee.findMany({
            include: {
                advances: true,
                salaries: true
            }
        });
        console.log('Employees found:', employees.length);
        
        console.log('Testing LeaveRequest query...');
        const leaves = await prisma.employeeLeaveRequest.findMany();
        console.log('Leaves found:', leaves.length);
    } catch (err) {
        console.error('PRISMA ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
