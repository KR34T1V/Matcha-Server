// dbseeder.js
const faker = require("faker");
const Seeder = require("mysql-db-seed").Seeder;
const { MY_SQL_HOST, MY_SQL_USERNAME, MY_SQL_PASSWORD, DATABASE_NAME } = require("./config");

// Generate a new Seeder instance
const seed = new Seeder(
  10, 
  MY_SQL_HOST,
  MY_SQL_USERNAME,
  MY_SQL_PASSWORD,
  DATABASE_NAME
);

(async () => {
    for (let i = 0; i < 50; i++){
        await seed.seed(
            10,
            "Users", 
            {
            DateCreated: seed.nativeTimestamp(),
            DateModified: seed.nativeTimestamp(),
            Username: faker.internet.userName,
            Firstname: faker.name.firstName,
            Lastname: faker.name.lastName,
            Birthdate: "1999-12-12",
            Gender: faker.random.arrayElement(["Male", "Female"]),
            SexualPreference: faker.random.arrayElement(["Heterosexual", "Homosexual", "Bisexual"]),
            Email: faker.internet.email,
            DateVerified: seed.nativeTimestamp(),
            Password: "$2a$06$YcGTjLn8Lu9DrLzKQdYywO/fTXWnSkOosSrTQPc3NS2EPc6IRQw9y", // !Testpass123
            Biography: faker.lorem.words(20),
            Avatar: faker.image.avatar
            }
        )
    }
    seed.exit();
    process.exit();
})();