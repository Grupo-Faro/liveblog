<?php
/**
 * Plugin updates from GitHub Releases.
 *
 * @package Liveblog
 */

/**
 * Class ElFaro_Liveblogs_Updater
 *
 * "El Faro Liveblogs" is a detached fork of the wordpress.org Liveblog plugin.
 * Its `Update URI` header points at GitHub, which makes WordPress skip the
 * wordpress.org update check for it and hand the decision to the
 * `update_plugins_github.com` filter instead. This class answers that filter
 * from the repository's latest GitHub Release, whose `elfaro-liveblogs.zip`
 * asset is built by the "Release" workflow.
 */
class ElFaro_Liveblogs_Updater {

	/**
	 * Repository (owner/name) used when the Update URI header cannot be read.
	 *
	 * @var string
	 */
	const REPOSITORY = 'Grupo-Faro/liveblog';

	/**
	 * Name of the release asset that contains the installable plugin.
	 *
	 * @var string
	 */
	const ASSET_NAME = 'elfaro-liveblogs.zip';

	/**
	 * Site transient holding the cached release lookup.
	 *
	 * @var string
	 */
	const CACHE_KEY = 'elfaro_liveblogs_release';

	/**
	 * How long a release lookup is cached, in seconds.
	 *
	 * @var int
	 */
	const CACHE_TTL = 6 * HOUR_IN_SECONDS;

	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string
	 */
	private static $plugin_file;

	/**
	 * Hook into the WordPress update system.
	 *
	 * @param string $plugin_file Absolute path to the main plugin file.
	 * @return void
	 */
	public static function load( $plugin_file ) {
		self::$plugin_file = $plugin_file;

		add_filter( 'update_plugins_github.com', array( __CLASS__, 'check_for_update' ), 10, 3 );
		add_filter( 'plugins_api', array( __CLASS__, 'plugin_information' ), 10, 3 );
		add_filter( 'upgrader_source_selection', array( __CLASS__, 'normalise_source_directory' ), 10, 4 );
		add_action( 'upgrader_process_complete', array( __CLASS__, 'clear_cache' ), 10, 2 );
	}

	/**
	 * Offer the latest GitHub Release as an update when it is newer.
	 *
	 * WordPress compares `version` with the installed one and files the result
	 * under "response" or "no_update" itself.
	 *
	 * @param array|false $update      Update data from an earlier filter, or false.
	 * @param array       $plugin_data Headers of the plugin being checked.
	 * @param string      $plugin_file Plugin basename being checked.
	 * @return array|false Update data, or the incoming value for other plugins.
	 */
	public static function check_for_update( $update, $plugin_data, $plugin_file ) {
		if ( self::basename() !== $plugin_file ) {
			return $update;
		}

		$release = self::get_latest_release();
		if ( empty( $release['version'] ) || empty( $release['package'] ) ) {
			return $update;
		}

		return array(
			'slug'         => self::slug(),
			'plugin'       => $plugin_file,
			'version'      => $release['version'],
			'new_version'  => $release['version'],
			'url'          => $release['url'],
			'package'      => $release['package'],
			'requires'     => isset( $plugin_data['RequiresWP'] ) ? $plugin_data['RequiresWP'] : '',
			'requires_php' => isset( $plugin_data['RequiresPHP'] ) ? $plugin_data['RequiresPHP'] : '',
		);
	}

	/**
	 * Feed the "View details" modal of the Plugins screen.
	 *
	 * @param false|object|array $result Result from an earlier filter.
	 * @param string             $action API action requested.
	 * @param object             $args   Request arguments (slug, fields...).
	 * @return false|object|array Plugin information for this plugin, or the incoming value.
	 */
	public static function plugin_information( $result, $action, $args ) {
		if ( 'plugin_information' !== $action || empty( $args->slug ) || self::slug() !== $args->slug ) {
			return $result;
		}

		$release = self::get_latest_release();
		if ( empty( $release['version'] ) ) {
			return $result;
		}

		if ( ! function_exists( 'get_plugin_data' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$plugin = get_plugin_data( self::$plugin_file, false, false );

		return (object) array(
			'name'          => $plugin['Name'],
			'slug'          => self::slug(),
			'version'       => $release['version'],
			'author'        => $plugin['Author'],
			'homepage'      => $plugin['PluginURI'],
			'requires'      => $plugin['RequiresWP'],
			'requires_php'  => $plugin['RequiresPHP'],
			'last_updated'  => $release['published'],
			'download_link' => $release['package'],
			'sections'      => array(
				'description' => wp_kses_post( wpautop( $plugin['Description'] ) ),
				'changelog'   => wp_kses_post( wpautop( esc_html( $release['notes'] ) ) ),
			),
		);
	}

	/**
	 * Make sure the unpacked update lands in the plugin's own directory.
	 *
	 * The release asset already ships a top-level `elfaro-liveblogs/` folder;
	 * this only kicks in if someone points WordPress at a differently named
	 * archive (a GitHub "source code" zip, for instance).
	 *
	 * @param string      $source        Unpacked source directory.
	 * @param string      $remote_source Directory the archive was unpacked into.
	 * @param WP_Upgrader $upgrader      Upgrader instance.
	 * @param array       $hook_extra    Extra arguments; `plugin` holds the basename being updated.
	 * @return string|WP_Error Directory to install from.
	 */
	public static function normalise_source_directory( $source, $remote_source, $upgrader, $hook_extra ) {
		global $wp_filesystem;

		if ( empty( $hook_extra['plugin'] ) || self::basename() !== $hook_extra['plugin'] ) {
			return $source;
		}

		$expected = trailingslashit( $remote_source ) . self::slug();
		if ( untrailingslashit( $source ) === untrailingslashit( $expected ) ) {
			return $source;
		}

		if ( $wp_filesystem && $wp_filesystem->move( untrailingslashit( $source ), $expected, true ) ) {
			return trailingslashit( $expected );
		}

		return new WP_Error(
			'elfaro_liveblogs_rename_failed',
			__( 'The update package could not be moved into the plugin directory.', 'liveblog' )
		);
	}

	/**
	 * Forget the cached release once a plugin has been updated.
	 *
	 * @param WP_Upgrader $upgrader   Upgrader instance.
	 * @param array       $hook_extra Extra arguments; `type` is "plugin" for plugin updates.
	 * @return void
	 */
	public static function clear_cache( $upgrader, $hook_extra ) {
		if ( isset( $hook_extra['type'] ) && 'plugin' === $hook_extra['type'] ) {
			delete_site_transient( self::CACHE_KEY );
		}
	}

	/**
	 * Look up the latest release on GitHub (cached).
	 *
	 * Misses are cached too, so an outage or a repository without releases
	 * does not turn into a request on every update check.
	 *
	 * @return array {
	 *     Empty when nothing usable was found.
	 *
	 *     @type string $version   Version number (tag without the leading "v").
	 *     @type string $url       Release page.
	 *     @type string $package   Download URL of the installable zip, or empty.
	 *     @type string $notes     Release notes (Markdown).
	 *     @type string $published Publication date.
	 * }
	 */
	public static function get_latest_release() {
		$cached = get_site_transient( self::CACHE_KEY );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$args = array(
			'timeout' => 3,
			'headers' => array(
				'Accept' => 'application/vnd.github+json',
			),
		);

		// Optional token for private repositories or higher API limits.
		if ( defined( 'ELFARO_LIVEBLOGS_GITHUB_TOKEN' ) && ELFARO_LIVEBLOGS_GITHUB_TOKEN ) {
			$args['headers']['Authorization'] = 'Bearer ' . ELFARO_LIVEBLOGS_GITHUB_TOKEN;
		}

		$release  = array();
		$response = wp_safe_remote_get( 'https://api.github.com/repos/' . self::repository() . '/releases/latest', $args );

		if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
			$body = json_decode( wp_remote_retrieve_body( $response ), true );

			if ( is_array( $body ) && ! empty( $body['tag_name'] ) ) {
				$release = array(
					'version'   => ltrim( $body['tag_name'], 'vV' ),
					'url'       => isset( $body['html_url'] ) ? $body['html_url'] : '',
					'package'   => '',
					'notes'     => isset( $body['body'] ) ? (string) $body['body'] : '',
					'published' => isset( $body['published_at'] ) ? $body['published_at'] : '',
				);

				$assets = isset( $body['assets'] ) && is_array( $body['assets'] ) ? $body['assets'] : array();
				foreach ( $assets as $asset ) {
					if ( isset( $asset['name'], $asset['browser_download_url'] ) && self::ASSET_NAME === $asset['name'] ) {
						$release['package'] = $asset['browser_download_url'];
						break;
					}
				}
			}
		}

		set_site_transient( self::CACHE_KEY, $release, self::CACHE_TTL );

		return $release;
	}

	/**
	 * Repository (owner/name) taken from the Update URI header.
	 *
	 * @return string
	 */
	private static function repository() {
		$headers = get_file_data( self::$plugin_file, array( 'UpdateURI' => 'Update URI' ) );
		$path    = empty( $headers['UpdateURI'] ) ? '' : trim( (string) wp_parse_url( $headers['UpdateURI'], PHP_URL_PATH ), '/' );

		return preg_match( '#^[\w.-]+/[\w.-]+$#', $path ) ? $path : self::REPOSITORY;
	}

	/**
	 * Plugin basename, e.g. "elfaro-liveblogs/elfaro-liveblogs.php".
	 *
	 * @return string
	 */
	private static function basename() {
		return plugin_basename( self::$plugin_file );
	}

	/**
	 * Plugin directory name, used as the update slug.
	 *
	 * @return string
	 */
	private static function slug() {
		return dirname( self::basename() );
	}
}
