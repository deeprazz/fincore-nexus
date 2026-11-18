package com.fincore.core_banking_services;

import com.fincore.core_banking_services.config.KeycloakSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

public class KeycloakJwtConverterTest {

    private final KeycloakSecurityConfig config = new KeycloakSecurityConfig();
    private final Converter<Jwt, ? extends AbstractAuthenticationToken> converter = config.keycloakJwtConverter();

    @Test
    void testTellerRoleMapping() {
        Jwt jwt = createJwtWithRoles("teller", List.of("TELLER"));
        AbstractAuthenticationToken auth = converter.convert(jwt);
        assertNotNull(auth);

        Set<String> authorities = extractAuthorities(auth);
        assertTrue(authorities.contains("ROLE_TELLER"), "Authorities should contain ROLE_TELLER");
        assertFalse(authorities.contains("ROLE_MANAGER"), "Teller should not have ROLE_MANAGER");
        assertFalse(authorities.contains("ROLE_ADMIN"), "Teller should not have ROLE_ADMIN");
    }

    @Test
    void testManagerRoleMapping() {
        Jwt jwt = createJwtWithRoles("manager", List.of("TELLER", "MANAGER"));
        AbstractAuthenticationToken auth = converter.convert(jwt);
        assertNotNull(auth);

        Set<String> authorities = extractAuthorities(auth);
        assertTrue(authorities.contains("ROLE_TELLER"), "Manager should contain ROLE_TELLER");
        assertTrue(authorities.contains("ROLE_MANAGER"), "Manager should contain ROLE_MANAGER");
        assertFalse(authorities.contains("ROLE_ADMIN"), "Manager should not have ROLE_ADMIN");
    }

    @Test
    void testAdminRoleMapping() {
        Jwt jwt = createJwtWithRoles("admin", List.of("ADMIN", "MANAGER", "TELLER"));
        AbstractAuthenticationToken auth = converter.convert(jwt);
        assertNotNull(auth);

        Set<String> authorities = extractAuthorities(auth);
        assertTrue(authorities.contains("ROLE_ADMIN"), "Admin should contain ROLE_ADMIN");
        assertTrue(authorities.contains("ROLE_MANAGER"), "Admin should contain ROLE_MANAGER");
        assertTrue(authorities.contains("ROLE_TELLER"), "Admin should contain ROLE_TELLER");
    }

    @Test
    void testCustomerRoleMapping() {
        Jwt jwt = createJwtWithRoles("customer", List.of("CUSTOMER"));
        AbstractAuthenticationToken auth = converter.convert(jwt);
        assertNotNull(auth);

        Set<String> authorities = extractAuthorities(auth);
        assertTrue(authorities.contains("ROLE_CUSTOMER"), "Authorities should contain ROLE_CUSTOMER");
        assertFalse(authorities.contains("ROLE_TELLER"), "Customer should not have staff roles");
        assertFalse(authorities.contains("ROLE_MANAGER"), "Customer should not have staff roles");
    }

    @Test
    void testMissingRealmAccessYieldsEmptyAuthorities() {
        Jwt jwt = Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .claim("sub", "anon")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        AbstractAuthenticationToken auth = converter.convert(jwt);
        assertNotNull(auth);
        assertFalse(extractAuthorities(auth).stream().anyMatch(a -> a.startsWith("ROLE_")));
    }

    private Jwt createJwtWithRoles(String sub, List<String> roles) {
        return Jwt.withTokenValue("mock-jwt-token-" + sub)
                .header("alg", "none")
                .claim("sub", sub)
                .claim("realm_access", Map.of("roles", roles))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    private Set<String> extractAuthorities(AbstractAuthenticationToken auth) {
        Set<String> set = new HashSet<>();
        for (GrantedAuthority ga : auth.getAuthorities()) {
            set.add(ga.getAuthority());
        }
        return set;
    }
}
