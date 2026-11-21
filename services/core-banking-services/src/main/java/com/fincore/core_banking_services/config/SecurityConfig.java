package com.fincore.core_banking_services.config;

import com.fincore.core_banking_services.customer.Customer;
import com.fincore.core_banking_services.customer.CustomerRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@Profile("!keycloak")
public class SecurityConfig {

    @Value("${fincore.security.teller-password:Teller@123}")
    private String tellerPassword;

    @Value("${fincore.security.manager-password:Manager@123}")
    private String managerPassword;

    @Value("${fincore.security.admin-password:Admin@123}")
    private String adminPassword;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/api/customer-portal/**").hasRole("CUSTOMER")
                        // Approvals: Pending approval management, KYC verify, account unfreeze, account close strictly require MANAGER or ADMIN
                        .requestMatchers("/api/approvals/**").hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers("/api/customers/*/kyc").hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/accounts/*/unfreeze").hasAnyRole("MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/accounts/*/close").hasAnyRole("MANAGER", "ADMIN")
                        // Admin-only verification
                        .requestMatchers("/api/audit/verify").hasRole("ADMIN")
                        // Audit view: MANAGER and ADMIN only (Teller cannot view audit)
                        .requestMatchers("/api/audit/**").hasAnyRole("MANAGER", "ADMIN")
                        // Operations: deposit, withdraw, transfer, freeze, create account/customer for TELLER, MANAGER, ADMIN
                        .requestMatchers(HttpMethod.POST, "/api/customers/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/customers/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/customers/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/accounts/*/deposit").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/accounts/*/withdraw").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/accounts/transfer").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/accounts/*/freeze").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/accounts").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        // Read access to staff APIs for Teller, Manager, Admin (and transactions for Customer)
                        .requestMatchers(HttpMethod.GET, "/api/transactions", "/api/transactions/**").hasAnyRole("CUSTOMER", "TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/accounts/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/customers/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers("/api/dashboard/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .requestMatchers("/api/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-Cache", "X-Latency", "X-Response-Time-Ms", "Idempotency-Key", "Content-Disposition"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    @Bean
    UserDetailsService userDetailsService(
            PasswordEncoder encoder,
            CustomerRepository customers) {

        String tellerPasswordHash = encoder.encode(tellerPassword);
        String managerPasswordHash = encoder.encode(managerPassword);
        String adminPasswordHash = encoder.encode(adminPassword);

        return username -> {
            if ("teller".equalsIgnoreCase(username)) {
                return User.withUsername("teller")
                        .password(tellerPasswordHash)
                        .roles("TELLER")
                        .build();
            }
            if ("manager".equalsIgnoreCase(username)) {
                return User.withUsername("manager")
                        .password(managerPasswordHash)
                        .roles("TELLER", "MANAGER")
                        .build();
            }
            if ("admin".equalsIgnoreCase(username)) {
                return User.withUsername("admin")
                        .password(adminPasswordHash)
                        .roles("ADMIN", "MANAGER", "TELLER")
                        .build();
            }

            Customer customer = customers.findByEmailIgnoreCase(username)
                    .or(() -> customers.findByNameIgnoreCase(username))
                    .filter(c -> c.getPasswordHash() != null)
                    .orElseThrow(() ->
                            new UsernameNotFoundException(
                                    "Invalid username or password"));

            return User.withUsername(customer.getEmail())
                    .password(customer.getPasswordHash())
                    .roles("CUSTOMER")
                    .build();
        };
    }
}
