<?php
/**
 * Settings page and publishing permissions.
 *
 * @package Liveblog
 */

/**
 * Class ElFaro_Liveblogs_Settings
 *
 * Adds "Settings → Liveblogs" and decides who may publish from the front end.
 * Upstream gates publishing on the `publish_posts` capability and on
 * `edit_post` for the target post; here the site picks the roles instead, so
 * a newsroom role can cover any active liveblog whoever wrote the post.
 * Enabling or archiving a liveblog is not affected: that stays with users who
 * can edit the post.
 */
class ElFaro_Liveblogs_Settings {

	/**
	 * Option holding the settings array.
	 *
	 * @var string
	 */
	const OPTION = 'elfaro_liveblogs_settings';

	/**
	 * Settings API option group.
	 *
	 * @var string
	 */
	const OPTION_GROUP = 'elfaro_liveblogs';

	/**
	 * Admin page slug.
	 *
	 * @var string
	 */
	const PAGE = 'elfaro-liveblogs';

	/**
	 * Capability required to manage the settings.
	 *
	 * @var string
	 */
	const CAPABILITY = 'manage_options';

	/**
	 * Absolute path to the main plugin file.
	 *
	 * @var string
	 */
	private static $plugin_file;

	/**
	 * Hook the settings page and the permission filters.
	 *
	 * @param string $plugin_file Absolute path to the main plugin file.
	 * @return void
	 */
	public static function load( $plugin_file ) {
		self::$plugin_file = $plugin_file;

		add_action( 'admin_menu', array( __CLASS__, 'add_options_page' ) );
		add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( $plugin_file ), array( __CLASS__, 'add_settings_link' ) );

		add_filter( 'liveblog_current_user_can_edit_liveblog', array( __CLASS__, 'filter_can_publish' ), 10, 2 );
		add_filter( 'liveblog_user_assignable_as_author', array( __CLASS__, 'filter_assignable_author' ), 10, 2 );
		add_filter( 'liveblog_author_query_args', array( __CLASS__, 'filter_author_query_args' ) );
	}

	/* Permissions ----------------------------------------------------------- */

	/**
	 * Roles allowed to publish entries from the front end.
	 *
	 * Until the settings are saved for the first time this is every role that
	 * holds `publish_posts`, which is what the upstream plugin allowed.
	 *
	 * @return string[] Role slugs.
	 */
	public static function get_publish_roles() {
		$settings = get_option( self::OPTION );

		if ( is_array( $settings ) && isset( $settings['publish_roles'] ) && is_array( $settings['publish_roles'] ) ) {
			return array_values( array_map( 'strval', $settings['publish_roles'] ) );
		}

		return self::roles_with_capability( wp_roles()->roles, 'publish_posts' );
	}

	/**
	 * Whether a user holds one of the publishing roles.
	 *
	 * @param int $user_id User id.
	 * @return bool
	 */
	public static function user_can_publish( $user_id ) {
		$user = get_userdata( (int) $user_id );

		if ( ! $user ) {
			return false;
		}

		return self::roles_allow( (array) $user->roles, self::get_publish_roles() );
	}

	/**
	 * Decide publishing permission from the configured roles.
	 *
	 * Replaces the capability-based answer: a role that is not selected may not
	 * publish even if it holds `publish_posts`, and a selected role may publish
	 * on any liveblog post even without `edit_post` on it.
	 *
	 * @param bool     $allowed Capability-based answer (ignored, the roles decide).
	 * @param int|null $post_id Target post for post-scoped checks, null for the global check.
	 * @return bool
	 */
	public static function filter_can_publish( $allowed, $post_id = null ) {
		unset( $allowed );

		$user_ok = is_user_logged_in() && self::user_can_publish( get_current_user_id() );

		if ( null === $post_id ) {
			return $user_ok;
		}

		return $user_ok && WPCOM_Liveblog::is_liveblog_post( (int) $post_id );
	}

	/**
	 * Let users of a publishing role be credited as author or contributor.
	 *
	 * @param bool $assignable Whether the user is assignable so far.
	 * @param int  $user_id    Candidate user id.
	 * @return bool
	 */
	public static function filter_assignable_author( $assignable, $user_id ) {
		return $assignable || self::user_can_publish( $user_id );
	}

	/**
	 * Include users of the publishing roles in the author picker.
	 *
	 * @param array $args WP_User_Query arguments.
	 * @return array
	 */
	public static function filter_author_query_args( $args ) {
		$roles = array_values(
			array_unique(
				array_merge(
					self::roles_with_capability( wp_roles()->roles, 'edit_posts' ),
					self::get_publish_roles()
				)
			)
		);

		unset( $args['capability'] );

		if ( empty( $roles ) ) {
			// No role qualifies: an empty role__in would match everyone.
			$args['include'] = array( 0 );
		} else {
			$args['role__in'] = $roles;
		}

		return $args;
	}

	/* Pure helpers (unit-tested) ------------------------------------------- */

	/**
	 * Slugs of the roles holding a capability.
	 *
	 * @param array  $roles      Roles as in `wp_roles()->roles`: slug => array( 'capabilities' => array( cap => bool ) ).
	 * @param string $capability Capability name.
	 * @return string[]
	 */
	public static function roles_with_capability( array $roles, $capability ) {
		$found = array();

		foreach ( $roles as $slug => $role ) {
			if ( ! empty( $role['capabilities'][ $capability ] ) ) {
				$found[] = (string) $slug;
			}
		}

		return $found;
	}

	/**
	 * Whether any of a user's roles is in the allowed list.
	 *
	 * @param array $user_roles    Role slugs of the user.
	 * @param array $allowed_roles Allowed role slugs.
	 * @return bool
	 */
	public static function roles_allow( array $user_roles, array $allowed_roles ) {
		return (bool) array_intersect( array_map( 'strval', $user_roles ), array_map( 'strval', $allowed_roles ) );
	}

	/**
	 * Keep only known role slugs, normalised and without duplicates.
	 *
	 * @param mixed    $roles       Submitted value.
	 * @param string[] $known_roles Existing role slugs.
	 * @return string[]
	 */
	public static function sanitize_roles( $roles, array $known_roles ) {
		if ( ! is_array( $roles ) ) {
			return array();
		}

		$clean = array();
		foreach ( $roles as $role ) {
			if ( ! is_scalar( $role ) ) {
				continue;
			}
			$clean[] = preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $role ) );
		}

		return array_values( array_unique( array_intersect( $clean, $known_roles ) ) );
	}

	/* Settings page --------------------------------------------------------- */

	/**
	 * Register the option, section and field.
	 *
	 * @return void
	 */
	public static function register_settings() {
		register_setting(
			self::OPTION_GROUP,
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanitize' ),
				'default'           => array(),
			)
		);

		add_settings_section(
			'elfaro_liveblogs_permissions',
			__( 'Publishing permissions', 'liveblog' ),
			array( __CLASS__, 'render_permissions_intro' ),
			self::PAGE
		);

		add_settings_field(
			'publish_roles',
			__( 'Roles allowed to publish', 'liveblog' ),
			array( __CLASS__, 'render_publish_roles_field' ),
			self::PAGE,
			'elfaro_liveblogs_permissions'
		);
	}

	/**
	 * Sanitize the submitted settings.
	 *
	 * @param mixed $input Submitted value.
	 * @return array
	 */
	public static function sanitize( $input ) {
		$roles = is_array( $input ) && isset( $input['publish_roles'] ) ? $input['publish_roles'] : array();

		return array(
			'publish_roles' => self::sanitize_roles( $roles, array_keys( wp_roles()->get_names() ) ),
		);
	}

	/**
	 * Add "Settings → Liveblogs".
	 *
	 * @return void
	 */
	public static function add_options_page() {
		add_options_page(
			'El Faro Liveblogs',
			__( 'Liveblogs', 'liveblog' ),
			self::CAPABILITY,
			self::PAGE,
			array( __CLASS__, 'render_page' )
		);
	}

	/**
	 * Render the settings page.
	 *
	 * @return void
	 */
	public static function render_page() {
		if ( ! current_user_can( self::CAPABILITY ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1>El Faro Liveblogs</h1>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::OPTION_GROUP );
				do_settings_sections( self::PAGE );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Intro text of the permissions section.
	 *
	 * @return void
	 */
	public static function render_permissions_intro() {
		echo '<p>' . esc_html__( 'Users with any of these roles can add, edit and delete entries from the page of any post with an active liveblog, whoever wrote the post. Enabling or archiving a liveblog still happens in the post editor, by users who can edit that post.', 'liveblog' ) . '</p>';
	}

	/**
	 * Checkbox per role.
	 *
	 * @return void
	 */
	public static function render_publish_roles_field() {
		$allowed = self::get_publish_roles();

		echo '<fieldset>';
		foreach ( wp_roles()->get_names() as $slug => $name ) {
			printf(
				'<label style="display:block;margin-bottom:6px"><input type="checkbox" name="%1$s[publish_roles][]" value="%2$s" %3$s> %4$s</label>',
				esc_attr( self::OPTION ),
				esc_attr( $slug ),
				checked( in_array( $slug, $allowed, true ), true, false ),
				esc_html( translate_user_role( $name ) )
			);
		}
		echo '</fieldset>';

		if ( empty( $allowed ) ) {
			echo '<p class="description">' . esc_html__( 'No role is selected: nobody can publish from the liveblog page.', 'liveblog' ) . '</p>';
		}
	}

	/**
	 * "Settings" link on the Plugins screen.
	 *
	 * @param string[] $links Existing action links.
	 * @return string[]
	 */
	public static function add_settings_link( $links ) {
		$url = admin_url( 'options-general.php?page=' . self::PAGE );
		array_unshift( $links, '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'liveblog' ) . '</a>' );

		return $links;
	}
}
