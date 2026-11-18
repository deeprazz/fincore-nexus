package com.fincore.payment_service.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
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
@Profile("!keycloak")
public class SecurityConfig {

    @Value("${fincore.security.teller-password:Teller@123}")
    private String tellerPassword;

    @Value("${fincore.security.manager-password:Manager@123}")
    private String managerPassword;

    @Value("${fincore.security.admin-password:Admin@123}")
    private String adminPassword;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService(PasswordEncoder encoder) {
        var manager = new InMemoryUserDetailsManager();
        manager.createUser(User.withUsername("teller").password(encoder.encode(tellerPassword)).roles("TELLER").build());
        manager.createUser(User.withUsername("manager").password(encoder.encode(managerPassword)).roles("TELLER", "MANAGER").build());
        manager.createUser(User.withUsername("admin").password(encoder.encode(adminPassword)).roles("ADMIN", "MANAGER", "TELLER").build());
        return manager;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/api/payments/audit/**").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/beneficiaries/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/beneficiaries/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/beneficiaries/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/payments/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/payments/**").hasAnyRole("TELLER", "MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/settlement/**").hasAnyRole("MANAGER", "ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/settlement/**").hasAnyRole("MANAGER", "ADMIN")
                .anyRequest().authenticated()
            )
            .httpBasic(withDefaults());
        return http.build();
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
}
