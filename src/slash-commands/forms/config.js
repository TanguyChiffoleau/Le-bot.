import { readFile } from 'fs/promises'
import { Constants } from 'discord.js'
import { interactionReply } from '../../util/util.js'

export default {
	name: 'config',
	description: 'Donne le formulaire des configs',
	options: [
		{
			type: 'user',
			optDesc: 'Membre',
		},
	],
	requirePermissions: [],
	interaction: async (interaction, client) => {
		const [config, configDescription] = await Promise.all([
			readFile('./forms/config.md', { encoding: 'utf8' }),
			readFile('./forms/configDescription.md', { encoding: 'utf8' }),
		])

		// Acquisition du membre
		const user = interaction.options.getUser('user') || interaction.user
		const member = interaction.guild.members.cache.get(user.id)
		if (!member)
			return interactionReply({
				interaction,
				content: "je n'ai pas trouvé cet utilisateur, vérifiez la mention ou l'ID 😕",
			})

		const embed = {
			color: '#C27C0E',
			title: 'Formulaire config',
			author: {
				name: interaction.guild.name,
				icon_url: interaction.guild.iconURL({ dynamic: true }),
				url: interaction.guild.vanityURL,
			},
			fields: [
				{
					name: 'Channel dans lequel renvoyer le formulaire complété',
					value: interaction.guild.channels.cache
						.get(client.config.configChannelID)
						.toString(),
				},
				{
					name: 'Précisions',
					value: configDescription,
				},
			],
		}

		try {
			await member.send({ embeds: [embed] })
			await member.send(config)
		} catch (error) {
			if (error.code !== Constants.APIErrors.CANNOT_MESSAGE_USER) throw error

			if (member === interaction.user)
				interactionReply({
					interaction,
					content:
						"je n'ai pas réussi à envoyer le message privé, tu as dû sûrement me bloquer / désactiver tes messages provenant du serveur 😬",
				})
			else
				interactionReply({
					interaction,
					content:
						"je n'ai pas réussi à envoyer le DM, l'utilisateur mentionné m'a sûrement bloqué / désactivé les messages provenant du serveur 😬",
				})
		}

		if (member.user.id === interaction.user.id)
			return interactionReply({
				interaction,
				content: `formulaire envoyé en message privé 👌`,
				isSilent: true,
			})
		return interactionReply({
			interaction,
			content: `formulaire envoyé en message privé à ${member} 👌`,
		})
	},
}