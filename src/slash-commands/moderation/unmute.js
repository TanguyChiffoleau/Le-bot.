import { SlashCommandBuilder } from '@discordjs/builders'
import { Constants, GuildMember } from 'discord.js'
import { readFile } from 'fs/promises'
import { db } from '../../util/util.js'

export default {
	data: new SlashCommandBuilder()
		.setName('unmute')
		.setDescription('Unmute un membre')
		.addUserOption(option =>
			option.setName('membre').setDescription('Membre').setRequired(true),
		),
	interaction: async (interaction, client) => {
		// Acquisition du membre
		const user = interaction.options.getUser('membre')
		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interaction.reply({
				content: "Je n'ai pas trouvé cet utilisateur, vérifie la mention ou l'ID 😕",
				ephemeral: true,
			})

		// Acquisition du rôle muted
		const mutedRole = client.config.mutedRoleID
		if (!mutedRole)
			return interaction.reply({
				content: "Il n'y a pas de rôle Muted 😕",
			})

		if (!member.roles.cache.has(mutedRole))
			return interaction.reply({
				content: "Le membre n'est pas muté 😕",
				ephemeral: true,
			})

		if (member.id === interaction.user.id)
			return interaction.reply({
				content: 'Tu ne peux pas te démute toi-même 😕',
				ephemeral: true,
			})

		// Acquisition de la base de données
		const bdd = await db(client, 'userbot')
		if (!bdd)
			return interaction.reply({
				content: 'Une erreur est survenue lors de la connexion à la base de données 😕',
				ephemeral: true,
			})

		// Lecture du message d'unmute
		const unmuteDM = await readFile('./forms/unmute.md', { encoding: 'utf8' })

		// Envoi du message d'unmute en message privé
		const DMMessage = await member
			.send({
				embeds: [
					{
						color: '#C27C0E',
						title: 'Mute terminé',
						description: unmuteDM,
						author: {
							name: interaction.guild.name,
							icon_url: interaction.guild.iconURL({ dynamic: true }),
							url: interaction.guild.vanityURL,
						},
					},
				],
			})
			.catch(error => {
				if (error.code === Constants.APIErrors.CANNOT_MESSAGE_USER)
					return interaction.reply({
						content:
							"Je n'ai pas réussi à envoyer le DM, l'utilisateur mentionné m'a sûrement bloqué / désactivé les messages provenant du serveur 😬",
						ephemeral: true,
					})

				console.error(error)
				return interaction.reply({
					content: "Une erreur est survenue lors de l'envoi du message privé 😬",
					ephemeral: true,
				})
			})

		// Vérification si déjà mute en base de données
		const sqlCheck = 'SELECT * FROM mute WHERE discordID = ?'
		const dataCheck = [member.id]
		const [resultCheck] = await bdd.execute(sqlCheck, dataCheck)

		// Si oui alors on lève le mute en base de données
		if (resultCheck[0]) {
			const sqlDelete = 'DELETE FROM mute WHERE discordID = ?'
			const dataDelete = [member.id]
			const [resultDelete] = await bdd.execute(sqlDelete, dataDelete)

			if (!resultDelete.affectedRows) {
				DMMessage.delete()
				return interaction.reply({
					content: 'Une erreur est survenue lors du mute du membre en base de données 😬',
				})
			}
		}

		const reinsertBDD = async () => {
			// Réinsertion du mute en base de données
			const sql =
				'INSERT INTO mute (discordID, timestampStart, timestampEnd) VALUES (?, ?, ?)'
			const data = [
				resultCheck[0].discordID,
				resultCheck[0].timestampStart,
				resultCheck[0].timestampEnd,
			]

			await bdd.execute(sql, data)
		}

		const unmuteAction = await member.roles.remove(mutedRole).catch(error => {
			DMMessage.delete()

			if (![reinsertBDD()].insertId)
				console.log(
					'Une erreur est survenue lors de la réinsertion du mute du membre en base de données',
				)

			if (error.code === Constants.APIErrors.MISSING_PERMISSIONS)
				return interaction.reply({
					content: "Je n'ai pas les permissions pour unmute ce membre 😬",
					ephemeral: true,
				})

			console.error(error)
			return interaction.reply({
				content: "Une erreur est survenue lors de l'unmute du membre 😬",
				ephemeral: true,
			})
		})

		// Si pas d'erreur, message de confirmation du mute
		if (unmuteAction instanceof GuildMember)
			await interaction.reply({
				content: `🔈 \`${member.user.tag}\` est démuté`,
			})

		// Si au moins une erreur, throw
		if (unmuteAction instanceof Error || DMMessage instanceof Error)
			throw new Error(
				"L'envoi d'un message et / ou l'unmute d'un membre a échoué. Voir les logs précédents pour plus d'informations.",
			)
	},
}
