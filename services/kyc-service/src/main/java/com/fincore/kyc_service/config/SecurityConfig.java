package com.fincore.kyc_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Profile("!keycloak")
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/**").permitAll()
                // KYC approvals strictly require MANAGER or ADMIN (Maker-Checker)
                .requestMatchers(HttpMethod.POST, "/api/kyc/*/approve").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/kyc/*/reject").hasAnyRole("MANAGER", "ADMIN")
                // Onboarding & viewing allowed for TELLER, MANAGER, ADMIN
                .requestMatchers("/api/kyc/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                // Compliance and Audit verification for MANAGER, ADMIN
                .requestMatchers("/api/compliance/**").hasAnyRole("MANAGER", "ADMIN", "TELLER")
                .anyRequest().authenticated()
            )
            .httpBasic(withDefaults());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        UserDetails teller = User.builder()
                .username("teller")
                .password(encoder.encode("Teller@123"))
                .roles("TELLER")
                .build();

        UserDetails manager = User.builder()
                .username("manager")
                .password(encoder.encode("Manager@123"))
                .roles("TELLER", "MANAGER")
                .build();

        UserDetails admin = User.builder()
                .username("admin")
                .password(encoder.encode("Admin@123"))
                .roles("ADMIN", "MANAGER", "TELLER")
                .build();

        return new InMemoryUserDetailsManager(teller, manager, admin);
    }
}
