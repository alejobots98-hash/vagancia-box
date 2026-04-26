require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  AttachmentBuilder
} = require("discord.js");

const discordTranscripts = require("discord-html-transcripts");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===================== CONFIGURACIÓN =====================
const PREFIX = "!box"; 
const CREAR_FILA_ROLE_ID = "1486959938038136912";
const STAFF_ROLE_ID = "1476541425263968391";
const EXTRA_MOD_ROLE_ID = "1211760228673257524"; 
const LOG_CHANNEL_ID = "1486176116413825206";

const estadosFilas = new Map();

// ===================== EMOJIS BOXEO =====================
const EMOJI_GUANTE = "🥊";
const EMOJI_RING = "🏟️";
const EMOJI_DINERO = "💸";

// ===================== EMBED PAGOS =====================
function embedPagos() {
  return new EmbedBuilder()
    .setColor(0x7c3aed) 
    .setTitle("🥊 MÉTODOS DE PAGO & REGLAS DEL RING")
    .setDescription(
`━━━━━━━━━━━━━━━━━━
**MÉTODOS DISPONIBLES**

🏦 **Naranja X**
┗ 👤 Alejo German Tolosa  
┗ 🔗 Alias: \`vg.apos\`

🌐 **AstroPay**
┗ 🔗 [Clic aquí para pagar](https://onetouch.astropay.com)

💎 **Binance**
┗ 🆔 ID: \`729592524\`

━━━━━━━━━━━━━━━━━━
**REGLAS DE APUESTAS**

💰 Comisión de **200 ARS** en Discord
🟢 Menos de **2.500 ARS** → **SIN comisión**
⚠️ Fuera de Discord → **10% del monto**

━━━━━━━━━━━━━━━━━━
**VAGANCIA BOXING SYSTEM**
⚔️ Sistema de combate automático
🛡️ **LA VAGANCIA • Org Oficial**`
    )
    .setFooter({ 
      text: "VAGANCIA • Boxeo por el Honor",
      iconURL: "attachment://logo.png" 
    });
}

// ===================== EMBED FILA =====================
function crearEmbedFila(data = { f1: null, f2: null, f3: null }) {
  const p1 = data.f1 ? `<@${data.f1}>` : "*Esperando rival...*";
  const p2 = data.f2 ? `<@${data.f2}>` : "*Esperando rival...*";
  const p3 = data.f3 ? `<@${data.f3}>` : "*Esperando rival...*";

  return new EmbedBuilder()
    .setColor(0x1e1b4b) 
    .setTitle(`${EMOJI_GUANTE} | ¿QUIÉN SE PLANTA?`)
    .setThumbnail("attachment://logo.png")
    .setDescription(
`**Formato:** Apostado ${EMOJI_DINERO}
**Valor:** A coordinar

**Cartelera de hoy:**
${EMOJI_RING} **Esquina 1:** ${p1}
${EMOJI_RING} **Esquina 2:** ${p2}
${EMOJI_RING} **Esquina 3:** ${p3}

**VAGANCIA • CAMPEONATO DE BOXEO**`
    );
}

// ===================== BOTONES =====================
function botonesTripleFila() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_f1").setLabel("Fila 1").setEmoji("🥊").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_f2").setLabel("Fila 2").setEmoji("🥊").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_f3").setLabel("Fila 3").setEmoji("🥊").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("salir_fila").setLabel("Retirarse").setEmoji("✖️").setStyle(ButtonStyle.Danger)
  );
}

// ===================== EVENTO MENSAJE =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot || message.content !== PREFIX) return;

  const esAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const tieneRol = message.member.roles.cache.has(CREAR_FILA_ROLE_ID);

  if (!esAdmin && !tieneRol) return message.reply("❌ No tenés permiso para armar el ring.");

  const fotoGato = new AttachmentBuilder('./logo.png', { name: 'logo.png' });

  const msg = await message.channel.send({
    embeds: [crearEmbedFila()],
    components: [botonesTripleFila()],
    files: [fotoGato]
  });

  estadosFilas.set(msg.id, { f1: null, f2: null, f3: null });
});

// ===================== EVENTO INTERACCIÓN =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // LÓGICA CERRAR PARTIDA
  if (interaction.customId === "cerrar_partida") {
    const puedeCerrar = interaction.member.roles.cache.has(STAFF_ROLE_ID) || 
                        interaction.member.roles.cache.has(EXTRA_MOD_ROLE_ID) ||
                        interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!puedeCerrar) return interaction.reply({ content: "❌ Solo el Staff puede terminar el combate.", ephemeral: true });
    
    const canalDestino = interaction.channel;
    await interaction.reply({ content: "⏳ Guardando reporte de la pelea...", ephemeral: true });
    
    try {
      const attachment = await discordTranscripts.createTranscript(canalDestino, {
        limit: -1, fileName: `pelea-${canalDestino.name}.html`, saveImages: true, poweredBy: false,
      });
      const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        await logChannel.send({
          content: `🥊 **Combate Finalizado**\nRing: \`${canalDestino.name}\`\nJuez: <@${interaction.user.id}>`,
          files: [attachment],
        });
      }
    } catch (e) { console.error("Error transcript:", e); }

    setTimeout(async () => {
      try { if (canalDestino?.deletable) await canalDestino.delete(); } catch (err) {}
    }, 2000);
    return;
  }

  // LÓGICA DE FILAS
  const data = estadosFilas.get(interaction.message.id);
  if (!data) return interaction.reply({ content: "❌ Error: Ring no encontrado.", ephemeral: true });

  const userId = interaction.user.id;
  const fotoGato = new AttachmentBuilder('./logo.png', { name: 'logo.png' });

  if (interaction.customId === "salir_fila") {
    if (data.f1 === userId) data.f1 = null;
    if (data.f2 === userId) data.f2 = null;
    if (data.f3 === userId) data.f3 = null;
    return await interaction.update({ embeds: [crearEmbedFila(data)], files: [fotoGato] });
  }

  const mapping = { "btn_f1": "f1", "btn_f2": "f2", "btn_f3": "f3" };
  const filaKey = mapping[interaction.customId];
  if (!filaKey) return;

  if (data.f1 === userId || data.f2 === userId || data.f3 === userId) {
    if (data[filaKey] !== userId) return interaction.reply({ content: "⚠️ Ya estás en una esquina.", ephemeral: true });
  }

  if (!data[filaKey]) {
    data[filaKey] = userId;
    await interaction.update({ embeds: [crearEmbedFila(data)], files: [fotoGato] });
  } else {
    if (data[filaKey] === userId) return interaction.reply({ content: "⚠️ Ya estás aquí.", ephemeral: true });
    
    const rivalId = data[filaKey];
    data[filaKey] = null; 

    await interaction.update({ embeds: [crearEmbedFila(data)], files: [fotoGato] });
    await crearCanalPrivado(interaction, [rivalId, userId]);
  }
});

// ===================== FUNCIÓN CANAL PRIVADO =====================
async function crearCanalPrivado(interaction, jugadores) {
  const guild = interaction.guild;
  const parent = interaction.channel.parent;
  const fotoGato = new AttachmentBuilder('./logo.png', { name: 'logo.png' });

  const nombres = jugadores
    .map((id) => guild.members.cache.get(id)?.user.username || "peleador")
    .join("-vs-").toLowerCase().replace(/[^a-z0-9\-]/g, "").slice(0, 80);

  const canal = await guild.channels.create({
    name: `🥊┃${nombres}`,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: EXTRA_MOD_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      ...jugadores.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] })),
    ],
  });

  const embedMatch = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle("¡PARENSE DE MANOS!")
    .setThumbnail("attachment://logo.png")
    .setDescription(
      `🔔 **EL COMBATE COMIENZA**\n\n` +
      `🔵 **Esquina Azul:** <@${jugadores[0]}>\n` +
      `🔴 **Esquina Roja:** <@${jugadores[1]}>\n\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `📢 **¡A pelear!** Coordinen su duelo y suban captura de pagos.\n` +
      `━━━━━━━━━━━━━━━━━━`
    );

  await canal.send({ 
    content: `${jugadores.map(id => `<@${id}>`).join(" ")} | <@&${STAFF_ROLE_ID}>`, 
    embeds: [embedMatch], 
    files: [fotoGato],
    components: [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("cerrar_partida").setLabel("FINALIZAR PELEA").setEmoji("🛑").setStyle(ButtonStyle.Danger)
        )
    ]
  });

  await canal.send({ embeds: [embedPagos()], files: [fotoGato] });
}

client.once("ready", () => console.log(`✅ Bot Boxeador cargando logo local. Comando: !box`));
client.login(process.env.TOKEN);