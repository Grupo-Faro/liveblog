<?php
/**
 * Unit tests for the settings helpers.
 *
 * @package Automattic\Liveblog\Tests\Unit
 */

declare( strict_types=1 );

namespace Automattic\Liveblog\Tests\Unit;

use Yoast\WPTestUtils\BrainMonkey\TestCase;
use ElFaro_Liveblogs_Settings;

require_once dirname( __DIR__, 2 ) . '/classes/class-elfaro-liveblogs-settings.php';

/**
 * Settings unit test case.
 */
final class SettingsTest extends TestCase {

	/**
	 * Roles are selected by capability.
	 *
	 * @covers ElFaro_Liveblogs_Settings::roles_with_capability
	 */
	public function test_roles_with_capability_lists_only_roles_holding_it(): void {
		$roles = array(
			'administrator' => array( 'capabilities' => array( 'publish_posts' => true ) ),
			'author'        => array( 'capabilities' => array( 'publish_posts' => true ) ),
			'contributor'   => array(
				'capabilities' => array(
					'edit_posts'    => true,
					'publish_posts' => false,
				),
			),
			'subscriber'    => array( 'capabilities' => array() ),
		);

		$this->assertSame( array( 'administrator', 'author' ), ElFaro_Liveblogs_Settings::roles_with_capability( $roles, 'publish_posts' ) );
		$this->assertSame( array( 'contributor' ), ElFaro_Liveblogs_Settings::roles_with_capability( $roles, 'edit_posts' ) );
	}

	/**
	 * One matching role is enough; none means no.
	 *
	 * @covers ElFaro_Liveblogs_Settings::roles_allow
	 */
	public function test_roles_allow_needs_one_matching_role(): void {
		$this->assertTrue( ElFaro_Liveblogs_Settings::roles_allow( array( 'subscriber', 'cronista' ), array( 'editor', 'cronista' ) ) );
		$this->assertFalse( ElFaro_Liveblogs_Settings::roles_allow( array( 'author' ), array( 'editor' ) ) );
		$this->assertFalse( ElFaro_Liveblogs_Settings::roles_allow( array( 'author' ), array() ) );
	}

	/**
	 * Unknown, malformed and duplicated values are dropped.
	 *
	 * @covers ElFaro_Liveblogs_Settings::sanitize_roles
	 */
	public function test_sanitize_roles_keeps_known_roles_only(): void {
		$known = array( 'administrator', 'editor', 'author' );

		$this->assertSame( array( 'editor', 'author' ), ElFaro_Liveblogs_Settings::sanitize_roles( array( 'editor', ' Author', 'hacker', 'editor', array( 'x' ) ), $known ) );
		$this->assertSame( array(), ElFaro_Liveblogs_Settings::sanitize_roles( 'editor', $known ) );
		$this->assertSame( array(), ElFaro_Liveblogs_Settings::sanitize_roles( array(), $known ) );
	}
}
