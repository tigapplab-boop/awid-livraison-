import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.clientToken.deleteMany();
  await prisma.clientAddress.deleteMany();
  await prisma.client.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.dailyStats.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.user.deleteMany();

  // ==================== ADMIN ====================
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Burger Minute',
      phone: '0550000000',
      role: 'ADMIN',
      password: hashSync('admin123', 10),
      isAvailable: true,
      mustChangePassword: true,
    },
  });
  console.log(`✅ Admin created: ${admin.name} (identifiant: 0550000000 / mot de passe: admin123)`);

  // ==================== LIVREURS ====================
  const livreur1 = await prisma.user.create({
    data: {
      name: 'Livreur',
      phone: 'livreur',
      role: 'LIVREUR',
      password: hashSync('livreur', 10),
      isAvailable: true,
    },
  });
  const livreur2 = await prisma.user.create({
    data: {
      name: 'Yacine',
      phone: '0552222222',
      role: 'LIVREUR',
      password: hashSync('livreur123', 10),
      isAvailable: true,
    },
  });
  console.log(`✅ Livreurs created: ${livreur1.name} (identifiant: livreur / mot de passe: livreur), ${livreur2.name}`);

  // ==================== ZONES ====================
  const zoneVille = await prisma.deliveryZone.create({
    data: {
      name: 'Ville',
      dayFee: 15000,   // 150 DA
      nightFee: 25000,  // 250 DA
      startNight: '19:00',
      endNight: '23:59',
      isActive: true,
    },
  });
  const zoneHorsVille = await prisma.deliveryZone.create({
    data: {
      name: 'Hors Ville',
      dayFee: 30000,   // 300 DA
      nightFee: 45000,  // 450 DA
      startNight: '19:00',
      endNight: '23:59',
      isActive: true,
    },
  });
  console.log(`✅ Zones created: ${zoneVille.name}, ${zoneHorsVille.name}`);

  // ==================== CATÉGORIES (Menu réel Burger Minute) ====================
  const catBurgers = await prisma.category.create({
    data: { name: 'Nos Burgers', nameAr: 'برغراتنا', sortOrder: 0, isActive: true },
  });
  const catSupplements = await prisma.category.create({
    data: { name: 'Suppléments', nameAr: 'إضافات', sortOrder: 1, isActive: true },
  });
  const catFrites = await prisma.category.create({
    data: { name: 'Frites', nameAr: 'بطاطس مقلية', sortOrder: 2, isActive: true },
  });
  const catBoissons = await prisma.category.create({
    data: { name: 'Nos Boissons', nameAr: 'مشروباتنا', sortOrder: 3, isActive: true },
  });
  console.log(`✅ Categories created: ${catBurgers.name}, ${catSupplements.name}, ${catFrites.name}, ${catBoissons.name}`);

  // ==================== PRODUITS (Menu réel Burger Minute - HKM) ====================
  const products = [
    // ---- Nos Burgers ----
    {
      name: 'Burger Viande',
      nameAr: 'برغر لحم',
      description: 'Salade, tomate, viande, sauce au choix, fromage',
      price: 25000, // 250 DA
      categoryId: catBurgers.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Burger Poulet Pané',
      nameAr: 'برغر دجاج مقلي',
      description: 'Salade, tomate, poulet pané, sauce au choix, fromage',
      price: 25000, // 250 DA
      categoryId: catBurgers.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Burger Poulet Haché',
      nameAr: 'برغر دجاج مفروم',
      description: 'Salade, tomate, poulet haché, sauce au choix, fromage',
      price: 25000, // 250 DA
      categoryId: catBurgers.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Burger Mixte',
      nameAr: 'برغر مشكل',
      description: 'Salade, tomate, poulet haché, viande, sauce au choix, fromage',
      price: 35000, // 350 DA
      categoryId: catBurgers.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Burger Viande Doublée',
      nameAr: 'برغر لحم مزدوج',
      description: 'Salade, tomate, viande doublée, sauce au choix, fromage',
      price: 35000, // 350 DA
      categoryId: catBurgers.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Big Burger',
      nameAr: 'بيغ برغر',
      description: 'Salade, tomate, poulet haché, viande doublée, sauce au choix, fromage',
      price: 45000, // 450 DA
      categoryId: catBurgers.id,
      isAvailable: true,
      image: null,
    },

    // ---- Suppléments ----
    {
      name: 'Œuf',
      nameAr: 'بيضة',
      description: 'Supplément œuf',
      price: 5000, // 50 DA
      categoryId: catSupplements.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Gruyère',
      nameAr: 'جرويار',
      description: 'Supplément fromage gruyère',
      price: 10000, // 100 DA
      categoryId: catSupplements.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Camembert',
      nameAr: 'كاممبير',
      description: 'Supplément fromage camembert',
      price: 10000, // 100 DA
      categoryId: catSupplements.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Poulet Fumé',
      nameAr: 'دجاج مدخن',
      description: 'Supplément poulet fumé',
      price: 10000, // 100 DA
      categoryId: catSupplements.id,
      isAvailable: true,
      image: null,
    },

    // ---- Frites ----
    {
      name: 'Barquette de Frites',
      nameAr: 'بطاطس مقلية',
      description: 'Barquette de frites croustillantes',
      price: 10000, // 100 DA
      categoryId: catFrites.id,
      isAvailable: true,
      image: null,
    },

    // ---- Nos Boissons ----
    {
      name: 'Eau 0,5 L',
      nameAr: 'ماء 0.5 ل',
      description: 'Bouteille eau minérale 0,5L',
      price: 4000, // 40 DA
      categoryId: catBoissons.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Eau 1,5 L',
      nameAr: 'ماء 1.5 ل',
      description: 'Bouteille eau minérale 1,5L',
      price: 5000, // 50 DA
      categoryId: catBoissons.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Canette 25 cl',
      nameAr: 'علبة 25 سل',
      description: 'Canette soda 25 cl au choix',
      price: 10000, // 100 DA
      categoryId: catBoissons.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Jus 25 cl',
      nameAr: 'عصير 25 سل',
      description: 'Jus de fruits 25 cl',
      price: 10000, // 100 DA
      categoryId: catBoissons.id,
      isAvailable: true,
      image: null,
    },
    {
      name: 'Coca 33 cl',
      nameAr: 'كوكا 33 سل',
      description: 'Coca-Cola 33 cl',
      price: 12000, // 120 DA
      categoryId: catBoissons.id,
      isAvailable: true,
      image: null,
    },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }
  console.log(`✅ ${products.length} products created`);

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
