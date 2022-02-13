import { convertDateForDiscord, diffDate } from '../../util/util.js'

export default async (ban, client) => {
	if (ban.user.bot || ban.guild.id !== client.config.guildID || !ban.guild.available) return

	// Acquisition du salon de logs
	const logsChannel = ban.guild.channels.cache.get(client.config.logsBansChannelID)
	if (!logsChannel) return

	// Fetch de l'event d'unban
	const fetchedLog = (
		await ban.guild.fetchAuditLogs({
			type: 'MEMBER_BAN_REMOVE',
			limit: 1,
		})
	).entries.first()
	if (!fetchedLog) return

	const { executor, target } = fetchedLog

	// Création de l'embed
	const logEmbed = {
		color: '57C92A',
		author: {
			name: `${target.username} (ID ${target.id})`,
			icon_url: target.displayAvatarURL({ dynamic: true }),
		},
		fields: [
			{
				name: 'Mention',
				value: target.toString(),
				inline: true,
			},
			{
				name: 'Date de création du compte',
				value: convertDateForDiscord(target.createdAt),
				inline: true,
			},
			{
				name: 'Âge du compte',
				value: diffDate(target.createdAt),
				inline: true,
			},
		],
		timestamp: new Date(),
	}

	// Détermination du modérateur ayant effectué le débannissement
	if (target.id === ban.user.id && fetchedLog.createdTimestamp > Date.now() - 5000)
		logEmbed.footer = {
			icon_url: executor.displayAvatarURL({ dynamic: true }),
			text: `Membre débanni par ${executor.tag}`,
		}
	else
		logEmbed.footer = {
			text: 'Membre débanni',
		}

	return logsChannel.send({ embeds: [logEmbed] })
}
