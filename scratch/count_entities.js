const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function count() {
    try {
        const catCount = await prisma.category.count();
        const prodCount = await prisma.product.count();
        const userCount = await prisma.user.count();
        const orderCount = await prisma.order.count();
        const empCount = await prisma.employee.count();

        console.log('SUMMARY:');
        console.log('- Categories:', catCount);
        console.log('- Products:', prodCount);
        console.log('- Users:', userCount);
        console.log('- Orders:', orderCount);
        console.log('- Employees:', empCount);
    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await prisma.$disconnect();
    }
}

count();
