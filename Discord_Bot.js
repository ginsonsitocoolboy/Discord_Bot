const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
} = require('discord.js');

const TOKEN = 'DEIN_BOT_TOKEN';
const CLIENT_ID = 'DEINE_APPLICATION_ID';
const GUILD_ID = 'DEINE_SERVER_ID';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName('randomperson')
    .setDescription('Wählt zufällig eine Person aus')

    .addSubcommand(sub =>
      sub
        .setName('all')
        .setDescription('Wählt aus allen Mitgliedern')
    )

    .addSubcommand(sub =>
      sub
        .setName('voice')
        .setDescription('Wählt nur aus Personen im Voice-Channel')
    )

    .addSubcommand(sub =>
      sub
        .setName('role')
        .setDescription('Wählt nur aus Personen mit einer bestimmten Rolle')
        .addRoleOption(option =>
          option
            .setName('rolle')
            .setDescription('Die Rolle, aus der gewählt werden soll')
            .setRequired(true)
        )
    )

    .toJSON(),
];

async function deployCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log('Slash-Commands wurden registriert.');
}

client.once('ready', () => {
  console.log(`Bot ist online als ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'randomperson') return;

  try {
    const subcommand = interaction.options.getSubcommand();
    const members = await interaction.guild.members.fetch();

    let filteredMembers = members.filter(member => !member.user.bot);

    if (subcommand === 'voice') {
      filteredMembers = filteredMembers.filter(member => member.voice.channel);
    }

    if (subcommand === 'role') {
      const rolle = interaction.options.getRole('rolle');
      filteredMembers = filteredMembers.filter(member =>
        member.roles.cache.has(rolle.id)
      );
    }

    if (filteredMembers.size === 0) {
      let message = 'Keine passende Person gefunden.';

      if (subcommand === 'voice') {
        message = 'Es ist gerade niemand im Voice-Channel.';
      }

      if (subcommand === 'role') {
        const rolle = interaction.options.getRole('rolle');
        message = `Ich habe niemanden mit der Rolle ${rolle} gefunden.`;
      }

      await interaction.reply(message);
      return;
    }

    const randomMember = filteredMembers.random();

    let replyText = `Zufällig ausgewählt wurde: <@${randomMember.id}>`;

    if (subcommand === 'all') {
      replyText += '\nModus: Alle Mitglieder';
    }

    if (subcommand === 'voice') {
      replyText += '\nModus: Nur Voice-Channel';
    }

    if (subcommand === 'role') {
      const rolle = interaction.options.getRole('rolle');
      replyText += `\nModus: Nur Rolle ${rolle}`;
    }

    await interaction.reply(replyText);

  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'Es ist ein Fehler passiert.',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'Es ist ein Fehler passiert.',
        ephemeral: true,
      });
    }
  }
});

deployCommands()
  .then(() => client.login(TOKEN))
  .catch(console.error);