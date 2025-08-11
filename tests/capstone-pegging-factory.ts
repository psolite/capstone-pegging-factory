import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CapstonePeggingFactory } from "../target/types/capstone_pegging_factory";
import wallet from "/home/xpsolitesol/Turbin3/turbin3-wallet.json";
import wrongwallet from "/home/xpsolitesol/Turbin3/Q3_25_Builder_psolite/capstone-pegging-factory/yyhaAh5uZTs88gjzbCwwzvtUEQxufKLFchBSmgmDyYX.json";
import { createMint, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

describe("capstone-pegging-factory", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.capstonePeggingFactory as Program<CapstonePeggingFactory>;

  const connection = anchor.AnchorProvider.env().connection;

  const keypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(wallet));

  const systemProgram = anchor.web3.SystemProgram.programId;
  const associatedTokenProgram = anchor.utils.token.ASSOCIATED_PROGRAM_ID;
  const tokenProgram = anchor.utils.token.TOKEN_PROGRAM_ID;

  let config: anchor.web3.PublicKey;
  // let tokenMint: anchor.web3.PublicKey; // This is the main token we are pegging to, like USDC
  let tokenMint = new anchor.web3.PublicKey("5xWuUaw5PnFDK6NqRdED9x5tSG3tCi7y8pBArQkgsVZP"); // This is the main token we are pegging to, like USDC
  let platformMint: anchor.web3.PublicKey;
  let treasury: anchor.web3.PublicKey;
  let platformPeg: anchor.web3.PublicKey;
  let platformTokenVault: anchor.web3.PublicKey;
  let projectMint: anchor.web3.PublicKey;
  let projectPeg: anchor.web3.PublicKey;
  let projectTokenVault: anchor.web3.PublicKey;
  let userPlatformTokenAccount: anchor.web3.PublicKey;
  let userTokenAccount: anchor.web3.PublicKey;
  let userProjectTokenAccount: anchor.web3.PublicKey;
  const wrongKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(wrongwallet));;


  before(async () => {

    // tokenMint = await createMintandMintSupply();

    // Get the Config PDA
    [config] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pegconfig"), keypair.publicKey.toBuffer()],
      program.programId
    );
    console.log("Config PDA:", config.toBase58());

    // Platform Peg
    [platformPeg] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform"), tokenMint.toBuffer(), config.toBuffer()],
      program.programId
    );
    console.log("Platform Peg PDA:", platformPeg.toBase58());

    // platform Mint
    [platformMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("peg"), platformPeg.toBuffer()],
      program.programId
    );
    console.log("Platform Mint PDA:", platformMint.toBase58());

    // Project Peg
    [projectPeg] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("project"), keypair.publicKey.toBuffer(), platformMint.toBuffer()],
      program.programId
    );
    console.log("Project Peg PDA:", projectPeg.toBase58());

    // Project Mint
    [projectMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("peg"), projectPeg.toBuffer()],
      program.programId
    );
    console.log("Project Mint PDA:", projectMint.toBase58());

    // Create associated token accounts for tokenVault (tokenMint)
    projectTokenVault = await getAssociatedTokenAddress(
      platformMint,
      projectPeg,
      true
    );
    console.log("Project Token Vault ATA:", projectTokenVault.toBase58());

    // Create associated token accounts for tokenVault (tokenMint)
    platformTokenVault = await getAssociatedTokenAddress(
      tokenMint,
      platformPeg,
      true
    );
    console.log("Platform Token Vault ATA:", platformTokenVault.toBase58());

    // Create associated token accounts for treasury (tokenMint)
    treasury = await getAssociatedTokenAddress(
      tokenMint,
      config,
      true
    );
    console.log("Treasury ATA:", treasury.toBase58());

    // Create associated token accounts for the user (tokenMint)
    userTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      tokenMint,
      keypair.publicKey
    )).address;

    console.log("User Token Account ATA:", userTokenAccount.toBase58());

  })

  // 1. Standard initialize
  it("Is initialized!", async () => {
    const check = await program.account.config.fetchNullable(config)

    if (!check) {
      const fee = 1 / 100 * 10000 // 1% fee
      const tx = await program.methods.initialize(fee)
        .accountsStrict({
          admin: keypair.publicKey,
          config,
          systemProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } else {
      console.log("Config have been Initialized");
    }
  });

  // 2. Initialize with wrong admin (simulate unauthorized admin)
  it("Is initialized with wrong admin!", async () => {
    const wrongKeypair = anchor.web3.Keypair.generate();
    const check = await program.account.config.fetchNullable(config)

    if (!check) {
      const fee = 1 / 100 * 10000 // 1% fee
      try {
        const tx = await program.methods.initialize(fee)
          .accountsStrict({
            admin: wrongKeypair.publicKey,
            config,
            systemProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Initialize with wrong admin failed as expected:", err.message);
      }
    } else {
      console.log("Config have been Initialized");
    }
  });

  // 3. Initialize with zero fee (should fail or be a no-op)
  it("Is initialized with zero fee!", async () => {
    const check = await program.account.config.fetchNullable(config)

    if (!check) {
      const fee = 0;
      try {
        const tx = await program.methods.initialize(fee)
          .accountsStrict({
            admin: keypair.publicKey,
            config,
            systemProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Initialize with zero fee failed as expected:", err.message);
      }
    } else {
      console.log("Config have been Initialized");
    }
  });

  // 4. Initialize with excessive fee (simulate invalid fee)
  it("Is initialized with excessive fee!", async () => {
    const check = await program.account.config.fetchNullable(config)

    if (!check) {
      const fee = 1000000; // Excessive fee
      try {
        const tx = await program.methods.initialize(fee)
          .accountsStrict({
            admin: keypair.publicKey,
            config,
            systemProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Initialize with excessive fee failed as expected:", err.message);
      }
    } else {
      console.log("Config have been Initialized");
    }
  });

  // 5. Initialize with wrong config PDA (simulate wrong config)
  it("Is initialized with wrong config PDA!", async () => {
    const wrongConfig = anchor.web3.Keypair.generate().publicKey;
    const check = await program.account.config.fetchNullable(config)

    if (!check) {
      const fee = 1 / 100 * 10000 // 1% fee
      try {
        const tx = await program.methods.initialize(fee)
          .accountsStrict({
            admin: keypair.publicKey,
            config: wrongConfig,
            systemProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Initialize with wrong config PDA failed as expected:", err.message);
      }
    } else {
      console.log("Config have been Initialized");
    }
  });

  // 6. Initialize twice (should succeed or fail if not allowed)
  it("Is initialized twice!", async () => {
    const check = await program.account.config.fetchNullable(config)

    if (!check) {
      const fee = 1 / 100 * 10000 // 1% fee
      try {
        const tx1 = await program.methods.initialize(fee)
          .accountsStrict({
            admin: keypair.publicKey,
            config,
            systemProgram
          }).rpc();
        console.log("First initialize transaction signature", tx1);

        const tx2 = await program.methods.initialize(fee)
          .accountsStrict({
            admin: keypair.publicKey,
            config,
            systemProgram
          }).rpc();
        console.log("Second initialize transaction signature", tx2);
      } catch (err) {
        console.log("Initialize twice failed as expected:", err.message);
      }
    } else {
      console.log("Config have been Initialized");
    }
  });

  // 1. Standard Platform Peg config
  it("Is Platform Peg config!", async () => {
    const check = await program.account.platformPeg.fetchNullable(platformPeg)

    if (!check) {
      const tx = await program.methods.platformPeg()
        .accountsStrict({
          owner: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } else {
      console.log("Platform peg have been Initialized");
    }
  });

  // 2. Platform Peg config with wrong owner (simulate unauthorized owner)
  it("Is Platform Peg config with wrong owner!", async () => {
    const wrongKeypair = anchor.web3.Keypair.generate();
    const check = await program.account.platformPeg.fetchNullable(platformPeg)

    if (!check) {
      try {
        const tx = await program.methods.platformPeg()
          .accountsStrict({
            owner: wrongKeypair.publicKey,
            tokenMint,
            config,
            platformMint,
            treasury,
            platformPeg,
            platformTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Platform peg config with wrong owner failed as expected:", err.message);
      }
    } else {
      console.log("Platform peg have been Initialized");
    }
  });

  // 3. Platform Peg config with wrong tokenMint (simulate wrong mint)
  it("Is Platform Peg config with wrong tokenMint!", async () => {
    const wrongTokenMint = anchor.web3.Keypair.generate().publicKey;
    const check = await program.account.platformPeg.fetchNullable(platformPeg)

    if (!check) {
      try {
        const tx = await program.methods.platformPeg()
          .accountsStrict({
            owner: keypair.publicKey,
            tokenMint: wrongTokenMint,
            config,
            platformMint,
            treasury,
            platformPeg,
            platformTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Platform peg config with wrong tokenMint failed as expected:", err.message);
      }
    } else {
      console.log("Platform peg have been Initialized");
    }
  });

  // 4. Platform Peg config with wrong platformMint (simulate wrong mint)
  it("Is Platform Peg config with wrong platformMint!", async () => {
    const wrongPlatformMint = anchor.web3.Keypair.generate().publicKey;
    const check = await program.account.platformPeg.fetchNullable(platformPeg)

    if (!check) {
      try {
        const tx = await program.methods.platformPeg()
          .accountsStrict({
            owner: keypair.publicKey,
            tokenMint,
            config,
            platformMint: wrongPlatformMint,
            treasury,
            platformPeg,
            platformTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Platform peg config with wrong platformMint failed as expected:", err.message);
      }
    } else {
      console.log("Platform peg have been Initialized");
    }
  });

  // 5. Platform Peg config with wrong platformPeg (simulate unauthorized peg)
  it("Is Platform Peg config with wrong platformPeg!", async () => {
    const wrongPlatformPeg = anchor.web3.Keypair.generate().publicKey;
    const check = await program.account.platformPeg.fetchNullable(platformPeg)

    if (!check) {
      try {
        const tx = await program.methods.platformPeg()
          .accountsStrict({
            owner: keypair.publicKey,
            tokenMint,
            config,
            platformMint,
            treasury,
            platformPeg: wrongPlatformPeg,
            platformTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Platform peg config with wrong platformPeg failed as expected:", err.message);
      }
    } else {
      console.log("Platform peg have been Initialized");
    }
  });

  // 6. Platform Peg config twice (should succeed or fail if not allowed)
  it("Is Platform Peg config twice!", async () => {
    const check = await program.account.platformPeg.fetchNullable(platformPeg)

    if (!check) {
      try {
        const tx1 = await program.methods.platformPeg()
          .accountsStrict({
            owner: keypair.publicKey,
            tokenMint,
            config,
            platformMint,
            treasury,
            platformPeg,
            platformTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("First platform peg config transaction signature", tx1);

        const tx2 = await program.methods.platformPeg()
          .accountsStrict({
            owner: keypair.publicKey,
            tokenMint,
            config,
            platformMint,
            treasury,
            platformPeg,
            platformTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Second platform peg config transaction signature", tx2);
      } catch (err) {
        console.log("Platform peg config twice failed as expected:", err.message);
      }
    } else {
      console.log("Platform peg have been Initialized");
    }
  });


  // 1. Standard Project Peg config
  it("Is Project Peg config!", async () => {
    const check = await program.account.projectPeg.fetchNullable(projectPeg)

    if (!check) {
      const ratioNumerator = new anchor.BN(2000)
      const ratioDenominator = new anchor.BN(1)
      const tx = await program.methods.projectPeg(ratioNumerator, ratioDenominator)
        .accountsStrict({
          owner: keypair.publicKey,
          projectMint,
          projectPeg,
          platformMint,
          platformPeg,
          projectTokenVault,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } else {
      console.log("Project peg have been Initialized");
    }
  });

  // 2. Project Peg config with zero ratio (should fail or be a no-op)
  it("Is Project Peg config with zero ratio!", async () => {
    const check = await program.account.projectPeg.fetchNullable(projectPeg)

    if (!check) {
      const ratioNumerator = new anchor.BN(0)
      const ratioDenominator = new anchor.BN(1)
      try {
        const tx = await program.methods.projectPeg(ratioNumerator, ratioDenominator)
          .accountsStrict({
            owner: keypair.publicKey,
            projectMint,
            projectPeg,
            platformMint,
            platformPeg,
            projectTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Project peg config with zero ratio failed as expected:", err.message);
      }
    } else {
      console.log("Project peg have been Initialized");
    }
  });

  // 3. Project Peg config with wrong owner (simulate unauthorized owner)
  it("Is Project Peg config with wrong owner!", async () => {
    const wrongKeypair = anchor.web3.Keypair.generate();
    const check = await program.account.projectPeg.fetchNullable(projectPeg)

    if (!check) {
      const ratioNumerator = new anchor.BN(2000)
      const ratioDenominator = new anchor.BN(1)
      try {
        const tx = await program.methods.projectPeg(ratioNumerator, ratioDenominator)
          .accountsStrict({
            owner: wrongKeypair.publicKey,
            projectMint,
            projectPeg,
            platformMint,
            platformPeg,
            projectTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Project peg config with wrong owner failed as expected:", err.message);
      }
    } else {
      console.log("Project peg have been Initialized");
    }
  });

  // 4. Project Peg config with wrong projectMint (simulate wrong mint)
  it("Is Project Peg config with wrong projectMint!", async () => {
    const wrongProjectMint = anchor.web3.Keypair.generate().publicKey;
    const check = await program.account.projectPeg.fetchNullable(projectPeg)

    if (!check) {
      const ratioNumerator = new anchor.BN(2000)
      const ratioDenominator = new anchor.BN(1)
      try {
        const tx = await program.methods.projectPeg(ratioNumerator, ratioDenominator)
          .accountsStrict({
            owner: keypair.publicKey,
            projectMint: wrongProjectMint,
            projectPeg,
            platformMint,
            platformPeg,
            projectTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Project peg config with wrong projectMint failed as expected:", err.message);
      }
    } else {
      console.log("Project peg have been Initialized");
    }
  });

  // 5. Project Peg config with wrong platformPeg (simulate unauthorized peg)
  it("Is Project Peg config with wrong platformPeg!", async () => {
    const wrongPlatformPeg = anchor.web3.Keypair.generate().publicKey;
    const check = await program.account.projectPeg.fetchNullable(projectPeg)

    if (!check) {
      const ratioNumerator = new anchor.BN(2000)
      const ratioDenominator = new anchor.BN(1)
      try {
        const tx = await program.methods.projectPeg(ratioNumerator, ratioDenominator)
          .accountsStrict({
            owner: keypair.publicKey,
            projectMint,
            projectPeg,
            platformMint,
            platformPeg: wrongPlatformPeg,
            projectTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Your transaction signature", tx);
      } catch (err) {
        console.log("Project peg config with wrong platformPeg failed as expected:", err.message);
      }
    } else {
      console.log("Project peg have been Initialized");
    }
  });

  // 6. Project Peg config twice (should succeed or fail if not allowed)
  it("Is Project Peg config twice!", async () => {
    const check = await program.account.projectPeg.fetchNullable(projectPeg)

    if (!check) {
      const ratioNumerator = new anchor.BN(2000)
      const ratioDenominator = new anchor.BN(1)
      try {
        const tx1 = await program.methods.projectPeg(ratioNumerator, ratioDenominator)
          .accountsStrict({
            owner: keypair.publicKey,
            projectMint,
            projectPeg,
            platformMint,
            platformPeg,
            projectTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("First project peg config transaction signature", tx1);

        const tx2 = await program.methods.projectPeg(ratioNumerator, ratioDenominator)
          .accountsStrict({
            owner: keypair.publicKey,
            projectMint,
            projectPeg,
            platformMint,
            platformPeg,
            projectTokenVault,
            systemProgram,
            tokenProgram,
            associatedTokenProgram
          }).rpc();
        console.log("Second project peg config transaction signature", tx2);
      } catch (err) {
        console.log("Project peg config twice failed as expected:", err.message);
      }
    } else {
      console.log("Project peg have been Initialized");
    }
  });


  // 1. Standard buy platform token
  it("Is Buying Platform Token!", async () => {
    userPlatformTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      platformMint,
      keypair.publicKey
    )).address;
    console.log("User Platform Token Account ATA:", userPlatformTokenAccount.toBase58());

    const amount = new anchor.BN(3000 * Math.pow(10, 6));
    const isPlatformMint = true;
    const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
      .accountsStrict({
        user: keypair.publicKey,
        tokenMint,
        config,
        platformMint,
        treasury,
        platformPeg,
        platformTokenVault,
        userPlatformTokenAccount,
        userTokenAccount,
        systemProgram,
        tokenProgram,
        associatedTokenProgram
      }).rpc();
    console.log("Your transaction signature", tx);
  });

  // 2. Buy platform token with zero amount (should fail or be a no-op)
  it("Is Buying Platform Token with zero amount!", async () => {
    userPlatformTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      platformMint,
      keypair.publicKey
    )).address;

    const amount = new anchor.BN(0);
    const isPlatformMint = true;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy platform token with zero amount failed as expected:", err.message);
    }
  });

  // 3. Buy platform token with insufficient funds (simulate by using a wrong user)
  it("Is Buying Platform Token with insufficient funds!", async () => {

    const wrongUserTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      wrongKeypair,
      tokenMint,
      wrongKeypair.publicKey
    )).address;
    const wrongUserPlatformTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      wrongKeypair,
      platformMint,
      wrongKeypair.publicKey
    )).address;

    const amount = new anchor.BN(1000000000 * Math.pow(10, 6)); // Large amount
    const isPlatformMint = true;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: wrongKeypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount: wrongUserPlatformTokenAccount,
          userTokenAccount: wrongUserTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy platform token with insufficient funds failed as expected:", err.message);
    }
  });

  // 4. Buy platform token with wrong platformPeg (simulate unauthorized peg)
  it("Is Buying Platform Token with wrong platformPeg!", async () => {
    userPlatformTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      platformMint,
      keypair.publicKey
    )).address;

    const wrongPlatformPeg = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(3000 * Math.pow(10, 6));
    const isPlatformMint = true;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg: wrongPlatformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy platform token with wrong platformPeg failed as expected:", err.message);
    }
  });

  // 5. Buy platform token with wrong tokenMint (simulate wrong mint)
  it("Is Buying Platform Token with wrong tokenMint!", async () => {
    userPlatformTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      platformMint,
      keypair.publicKey
    )).address;

    const wrongTokenMint = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(3000 * Math.pow(10, 6));
    const isPlatformMint = true;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint: wrongTokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy platform token with wrong tokenMint failed as expected:", err.message);
    }
  });

  // 6. Buy platform token twice (should succeed or fail if not allowed)
  it("Is Buying Platform Token twice!", async () => {
    userPlatformTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      platformMint,
      keypair.publicKey
    )).address;

    const amount = new anchor.BN(3000 * Math.pow(10, 6));
    const isPlatformMint = true;
    try {
      const tx1 = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("First buy transaction signature", tx1);

      const tx2 = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Second buy transaction signature", tx2);
    } catch (err) {
      console.log("Buy platform token twice failed as expected:", err.message);
    }
  });



  // 1. Standard sell platform token
  it("Is Selling Platform Token!", async () => {
    const amount = new anchor.BN(1000 * Math.pow(10, 6));
    const isPlatformMint = false;
    const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
      .accountsStrict({
        user: keypair.publicKey,
        tokenMint,
        config,
        platformMint,
        treasury,
        platformPeg,
        platformTokenVault,
        userPlatformTokenAccount,
        userTokenAccount,
        systemProgram,
        tokenProgram,
        associatedTokenProgram
      }).rpc();
    console.log("Your transaction signature", tx);
  });

  // 2. Sell platform token with zero amount (should fail or be a no-op)
  it("Is Selling Platform Token with zero amount!", async () => {
    const amount = new anchor.BN(0);
    const isPlatformMint = false;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell platform token with zero amount failed as expected:", err.message);
    }
  });

  // 3. Sell platform token with insufficient funds (simulate by using a wrong user)
  it("Is Selling Platform Token with insufficient funds!", async () => {
    const wrongKeypair = anchor.web3.Keypair.generate();

    // Ensure wrong user's base token account exists and is initialized
    const wrongUserTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair, // payer must be a funded account
      tokenMint,
      wrongKeypair.publicKey
    );
    const wrongUserTokenAccount = wrongUserTokenAccountInfo.address;

    // Ensure wrong user's platform token account exists and is initialized
    const wrongUserPlatformTokenAccountInfo = await getOrCreateAssociatedTokenAccount(
      connection,
      keypair, // payer must be a funded account
      platformMint,
      wrongKeypair.publicKey
    );
    const wrongUserPlatformTokenAccount = wrongUserPlatformTokenAccountInfo.address;

    const amount = new anchor.BN(1000000000 * Math.pow(10, 6)); // Large amount
    const isPlatformMint = false;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: wrongKeypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount: wrongUserPlatformTokenAccount,
          userTokenAccount: wrongUserTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell platform token with insufficient funds failed as expected:", err.message);
    }
  });

  // 4. Sell platform token with wrong platformPeg (simulate unauthorized peg)
  it("Is Selling Platform Token with wrong platformPeg!", async () => {
    const wrongPlatformPeg = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(1000 * Math.pow(10, 6));
    const isPlatformMint = false;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg: wrongPlatformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell platform token with wrong platformPeg failed as expected:", err.message);
    }
  });

  // 5. Sell platform token with wrong tokenMint (simulate wrong mint)
  it("Is Selling Platform Token with wrong tokenMint!", async () => {
    const wrongTokenMint = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(1000 * Math.pow(10, 6));
    const isPlatformMint = false;
    try {
      const tx = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint: wrongTokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell platform token with wrong tokenMint failed as expected:", err.message);
    }
  });

  // 6. Sell platform token twice (should succeed or fail if not allowed)
  it("Is Selling Platform Token twice!", async () => {
    const amount = new anchor.BN(1000 * Math.pow(10, 6));
    const isPlatformMint = false;
    try {
      const tx1 = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("First sell transaction signature", tx1);

      const tx2 = await program.methods.swapPlatformPeg(amount, isPlatformMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          treasury,
          platformPeg,
          platformTokenVault,
          userPlatformTokenAccount,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Second sell transaction signature", tx2);
    } catch (err) {
      console.log("Sell platform token twice failed as expected:", err.message);
    }
  });



  // 1. Standard buy project token
  it("Is Buying Project Token!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    console.log("User Project Token Account ATA:", userProjectTokenAccount.toBase58());

    const amount = new anchor.BN(50000 * Math.pow(10, 6));
    const isProjectMint = true;
    const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
      .accountsStrict({
        user: keypair.publicKey,
        tokenMint,
        config,
        platformMint,
        projectMint,
        projectPeg,
        projectTokenVault,
        userProjectTokenAccount,
        treasury,
        platformPeg,
        platformTokenVault,
        userTokenAccount,
        systemProgram,
        tokenProgram,
        associatedTokenProgram
      }).rpc();
    console.log("Your transaction signature", tx);
  });

  // 2. Buy project token with zero amount (should fail or be a no-op)
  it("Is Buying Project Token with zero amount!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const amount = new anchor.BN(0);
    const isProjectMint = true;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy project token with zero amount failed as expected:", err.message);
    }
  });

  // 3. Buy project token with insufficient funds (simulate by using a wrong user)
  it("Is Buying Project Token with insufficient funds!", async () => {
   

    const wrongUserTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      wrongKeypair,
      tokenMint,
      wrongKeypair.publicKey
    )).address;
    const wrongUserProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      wrongKeypair,
      projectMint,
      wrongKeypair.publicKey
    )).address;

    const amount = new anchor.BN(1000000000 * Math.pow(10, 6)); // Large amount
    const isProjectMint = true;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: wrongKeypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount: wrongUserProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount: wrongUserTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy project token with insufficient funds failed as expected:", err.message);
    }
  });

  // 4. Buy project token with wrong projectPeg (simulate unauthorized peg)
  it("Is Buying Project Token with wrong projectPeg!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const wrongProjectPeg = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(50000 * Math.pow(10, 6));
    const isProjectMint = true;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg: wrongProjectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy project token with wrong projectPeg failed as expected:", err.message);
    }
  });

  // 5. Buy project token with wrong tokenMint (simulate wrong mint)
  it("Is Buying Project Token with wrong tokenMint!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const wrongTokenMint = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(50000 * Math.pow(10, 6));
    const isProjectMint = true;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint: wrongTokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Buy project token with wrong tokenMint failed as expected:", err.message);
    }
  });

  // 6. Buy project token twice (should succeed or fail if not allowed)
  it("Is Buying Project Token twice!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const amount = new anchor.BN(50000 * Math.pow(10, 6));
    const isProjectMint = true;
    try {
      const tx1 = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("First buy transaction signature", tx1);

      const tx2 = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Second buy transaction signature", tx2);
    } catch (err) {
      console.log("Buy project token twice failed as expected:", err.message);
    }
  });



  // 1. Standard sell project token
  it("Is Selling Project Token!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    console.log("User Project Token Account ATA:", userProjectTokenAccount.toBase58());

    const amount = new anchor.BN(900 * Math.pow(10, 6));
    const isProjectMint = false;
    const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
      .accountsStrict({
        user: keypair.publicKey,
        tokenMint,
        config,
        platformMint,
        projectMint,
        projectPeg,
        projectTokenVault,
        userProjectTokenAccount,
        treasury,
        platformPeg,
        platformTokenVault,
        userTokenAccount,
        systemProgram,
        tokenProgram,
        associatedTokenProgram
      }).rpc();
    console.log("Your transaction signature", tx);
  });

  // 2. Sell project token with zero amount (should fail or be a no-op)
  it("Is Selling Project Token with zero amount!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const amount = new anchor.BN(0);
    const isProjectMint = false;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell project token with zero amount failed as expected:", err.message);
    }
  });

  // 3. Sell project token with insufficient funds (simulate by using a wrong user)
  it("Is Selling Project Token with insufficient funds!", async () => {
    const wrongKeypair = anchor.web3.Keypair.generate();
    // Use a funded payer (keypair) to create the ATA for the wrong user
    const wrongUserProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair, // payer must be funded
      projectMint,
      wrongKeypair.publicKey
    )).address;
    // Ensure wrong user's base token account exists
    const wrongUserTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair, // payer must be funded
      tokenMint,
      wrongKeypair.publicKey
    )).address;

    const amount = new anchor.BN(1000000000 * Math.pow(10, 6)); // Large amount
    const isProjectMint = false;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: wrongKeypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount: wrongUserProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount: wrongUserTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell project token with insufficient funds failed as expected:", err.message);
    }
  });

  // 4. Sell project token with wrong projectPeg (simulate unauthorized peg)
  it("Is Selling Project Token with wrong projectPeg!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const wrongProjectPeg = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(900 * Math.pow(10, 6));
    const isProjectMint = false;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg: wrongProjectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell project token with wrong projectPeg failed as expected:", err.message);
    }
  });

  // 5. Sell project token with wrong tokenMint (simulate wrong mint)
  it("Is Selling Project Token with wrong tokenMint!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const wrongTokenMint = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(900 * Math.pow(10, 6));
    const isProjectMint = false;
    try {
      const tx = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint: wrongTokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Sell project token with wrong tokenMint failed as expected:", err.message);
    }
  });

  // 6. Sell project token twice (should succeed or fail if not allowed)
  it("Is Selling Project Token twice!", async () => {
    userProjectTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      projectMint,
      keypair.publicKey
    )).address;

    const amount = new anchor.BN(900 * Math.pow(10, 6));
    const isProjectMint = false;
    try {
      const tx1 = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("First sell transaction signature", tx1);

      const tx2 = await program.methods.swapProjectPeg(amount, isProjectMint)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectMint,
          projectPeg,
          projectTokenVault,
          userProjectTokenAccount,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Second sell transaction signature", tx2);
    } catch (err) {
      console.log("Sell project token twice failed as expected:", err.message);
    }
  });

  // 1. Standard deposit yield
  it("Is Depositing Yield!", async () => {
    const amount = new anchor.BN(900 * Math.pow(10, 6));
    const tx = await program.methods.depositYield(amount)
      .accountsStrict({
        user: keypair.publicKey,
        tokenMint,
        config,
        platformMint,
        projectPeg,
        projectTokenVault,
        treasury,
        platformPeg,
        platformTokenVault,
        userTokenAccount,
        systemProgram,
        tokenProgram,
        associatedTokenProgram
      }).rpc();
    console.log("Your transaction signature", tx);
  });

  // 2. Deposit yield with zero amount (should fail or be a no-op)
  it("Is Depositing Yield with zero amount!", async () => {
    const amount = new anchor.BN(0);
    try {
      const tx = await program.methods.depositYield(amount)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectPeg,
          projectTokenVault,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Deposit yield with zero amount failed as expected:", err.message);
    }
  });

  // 3. Deposit yield with insufficient funds (simulate by using a wrong user)
  it("Is Depositing Yield with insufficient funds!", async () => {
  

    const wrongUserTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      wrongKeypair,
      tokenMint,
      wrongKeypair.publicKey
    )).address;
    const amount = new anchor.BN(1000000000 * Math.pow(10, 6)); // Large amount
    try {
      const tx = await program.methods.depositYield(amount)
        .accountsStrict({
          user: wrongKeypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectPeg,
          projectTokenVault,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount: wrongUserTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Deposit yield with insufficient funds failed as expected:", err.message);
    }
  });

  // 4. Deposit yield with wrong projectPeg (simulate unauthorized peg)
  it("Is Depositing Yield with wrong projectPeg!", async () => {
    const wrongProjectPeg = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(900 * Math.pow(10, 6));
    try {
      const tx = await program.methods.depositYield(amount)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectPeg: wrongProjectPeg,
          projectTokenVault,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Deposit yield with wrong projectPeg failed as expected:", err.message);
    }
  });

  // 5. Deposit yield with wrong tokenMint (simulate wrong mint)
  it("Is Depositing Yield with wrong tokenMint!", async () => {
    const wrongTokenMint = anchor.web3.Keypair.generate().publicKey;
    const amount = new anchor.BN(900 * Math.pow(10, 6));
    try {
      const tx = await program.methods.depositYield(amount)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint: wrongTokenMint,
          config,
          platformMint,
          projectPeg,
          projectTokenVault,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Deposit yield with wrong tokenMint failed as expected:", err.message);
    }
  });

  // 6. Deposit yield twice (should succeed or fail if not allowed)
  it("Is Depositing Yield twice!", async () => {
    const amount = new anchor.BN(900 * Math.pow(10, 6));
    try {
      const tx1 = await program.methods.depositYield(amount)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectPeg,
          projectTokenVault,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("First deposit transaction signature", tx1);

      const tx2 = await program.methods.depositYield(amount)
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          platformMint,
          projectPeg,
          projectTokenVault,
          treasury,
          platformPeg,
          platformTokenVault,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Second deposit transaction signature", tx2);
    } catch (err) {
      console.log("Deposit yield twice failed as expected:", err.message);
    }
  });


  // Try to claim fees with wrong user (simulate unauthorized claim)
  it("Is Claiming fees with wrong user!", async () => {
    

    // Ensure the wrong user's token account exists
    const wrongUserTokenAccount = (await getOrCreateAssociatedTokenAccount(
      connection,
      wrongKeypair,
      tokenMint,
      wrongKeypair.publicKey
    )).address;

    try {
      const tx = await program.methods.claimFees()
        .accountsStrict({
          user: wrongKeypair.publicKey,
          tokenMint,
          config,
          treasury,
          userTokenAccount: wrongUserTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Claim fees with wrong user failed as expected:", err.message);
    }
  });

  // Claim fees (checks if not claimed)
  it("Is Claiming fees!", async () => {
    // If you want to check if fees are claimable, you may need to fetch some state.
    // For now, just run the transaction.
    const tx = await program.methods.claimFees()
      .accountsStrict({
        user: keypair.publicKey,
        tokenMint,
        config,
        treasury,
        userTokenAccount,
        systemProgram,
        tokenProgram,
        associatedTokenProgram
      }).rpc();
    console.log("Your transaction signature", tx);
  });

  // Try to claim fees again (should be idempotent or fail if already claimed)
  it("Is Claiming fees again!", async () => {
    try {
      const tx = await program.methods.claimFees()
        .accountsStrict({
          user: keypair.publicKey,
          tokenMint,
          config,
          treasury,
          userTokenAccount,
          systemProgram,
          tokenProgram,
          associatedTokenProgram
        }).rpc();
      console.log("Your transaction signature", tx);
    } catch (err) {
      console.log("Claim fees failed as expected:", err.message);
    }
  });








  // Helper
  const createMintandMintSupply = async (tokenMint?: anchor.web3.PublicKey) => {

    const mint = tokenMint ? tokenMint : await createMint(
      connection,
      keypair,
      keypair.publicKey,
      null,
      6
    );

    console.log("Mint created:", mint.toBase58());
    // Create an ATA for Mint 
    const ata = (await getOrCreateAssociatedTokenAccount(
      connection,
      keypair,
      mint,
      keypair.publicKey
    )).address;

    console.log(`ATA for Mint X is: ${ata.toBase58()}`);

    // Mint to userAtaX
    const mintXTx = await mintTo(
      connection,
      keypair,
      mint,
      ata,
      keypair.publicKey,
      1000000000000 * Math.pow(10, 6)
    );
    console.log(`Your mint txid for 1000000 Token: ${mintXTx}`);

    return mint
  }
});
